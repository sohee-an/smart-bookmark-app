import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { rateLimit, getClientIp } from "@/shared/lib/rateLimit";
import { GUEST_COOKIE } from "@/shared/lib/guestCookie";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 게스트가 요청 본문에 실어 보내는 localStorage 북마크 (서버 payload 상한)
const MAX_GUEST_CONTEXT = 20;

type MatchRow = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  thumbnail_url: string | null;
  similarity: number;
};

type GuestBookmark = {
  id: string;
  url: string;
  title?: string | null;
  summary?: string | null;
  thumbnailUrl?: string | null;
};

/** SSE 근거 북마크 카드 페이로드 */
type ChatSource = {
  n: number;
  id: string;
  url: string;
  title: string;
  summary: string;
  thumbnailUrl: string | null;
  similarity: number;
};

function buildPrompt(question: string, sources: ChatSource[]): string {
  const context =
    sources.length > 0
      ? sources
          .map((s) => `[${s.n}] 제목: ${s.title}\n요약: ${s.summary}\nURL: ${s.url}`)
          .join("\n\n")
      : "(관련 북마크 없음)";

  // 목적: 검색(찾아주기)이 아니라 여러 북마크를 종합해 정리/요약/추천하는 것 (grounding 포함)
  return `당신은 사용자가 저장한 북마크를 종합해 정리·요약·추천해주는 어시스턴트입니다.
규칙:
- 아래 [북마크]에 있는 내용만 사용해 한국어로 답하세요. 외부 지식·추측 금지.
- 단순히 목록만 나열하지 말고, 여러 북마크를 묶어 핵심을 요약하거나 공통점·차이를 정리해 주세요.
- 답에 사용한 북마크는 문장 끝에 [번호] 형태로 인용하세요.
- [북마크]에서 답을 찾을 수 없으면 "저장된 북마크에서 관련 내용을 찾지 못했어요."라고만 답하세요.

[북마크]
${context}

[질문]
${question}`;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const isGuest = cookieStore.get(GUEST_COOKIE)?.value === "true";

  if (!user && !isGuest) {
    return Response.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  // 남용/과금 DoS 방어 — 게스트는 더 좁게. 클라 카운터가 위조돼도 서버가 실제 비용을 캡한다.
  const ip = getClientIp(request);
  const rl = user
    ? rateLimit(`chat:${user.id}:${ip}`, 20, 60_000)
    : rateLimit(`chat-guest:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return Response.json(
      { success: false, message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const body = await request.json();
  const question: string = body.question;
  if (!question?.trim()) {
    return Response.json({ success: false, message: "질문이 없어요." }, { status: 400 });
  }

  // 근거 회수 — 회원은 pgvector 유사도 회수, 게스트는 요청에 담긴 localStorage 북마크를 그대로 context로
  let sources: ChatSource[];
  if (user) {
    const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const emb = await embedModel.embedContent({
      content: { parts: [{ text: question }], role: "user" },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: 3072,
    } as Parameters<typeof embedModel.embedContent>[0]);

    const { data: matches } = await supabase.rpc("match_bookmarks", {
      query_embedding: emb.embedding.values,
      p_user_id: user.id,
      match_threshold: 0.5, // 대화형은 검색보다 넓게 회수
      match_count: 6,
      p_tags: null,
    });

    sources = ((matches ?? []) as MatchRow[]).map((r, i) => ({
      n: i + 1,
      id: r.id,
      url: r.url,
      title: r.title ?? "",
      summary: r.summary ?? "",
      thumbnailUrl: r.thumbnail_url,
      similarity: r.similarity,
    }));
  } else {
    const guest: GuestBookmark[] = Array.isArray(body.bookmarks) ? body.bookmarks : [];
    sources = guest.slice(0, MAX_GUEST_CONTEXT).map((b, i) => ({
      n: i + 1,
      id: b.id,
      url: b.url,
      title: b.title ?? "",
      summary: b.summary ?? "",
      thumbnailUrl: b.thumbnailUrl ?? null,
      similarity: 1,
    }));
  }

  const genModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 근거 카드를 먼저 보내 클라이언트가 답변과 함께 렌더할 수 있게
        send("sources", sources);

        const result = await genModel.generateContentStream(buildPrompt(question, sources));
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) send("token", { text });
        }
        send("done", {});
      } catch (e) {
        console.error("[API Chat] 스트리밍 오류:", e);
        send("error", { message: "답변 생성 중 오류가 발생했어요." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
