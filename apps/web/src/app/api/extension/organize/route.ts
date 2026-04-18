import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Resend } from "resend";
import { getUserFromBearer, CORS_HEADERS } from "../_lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "ansoso634@gmail.com";

async function sendErrorAlert(params: {
  userEmail: string;
  situation: string;
  error: string;
  itemCount?: number;
}) {
  try {
    await resend.emails.send({
      from: "SmartMark <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `[SmartMark] AI 정리 오류 — ${params.situation}`,
      html: `
        <h2>AI 북마크 정리 오류 알림</h2>
        <table>
          <tr><td><b>유저 이메일</b></td><td>${params.userEmail}</td></tr>
          <tr><td><b>상황</b></td><td>${params.situation}</td></tr>
          ${params.itemCount !== undefined ? `<tr><td><b>북마크 수</b></td><td>${params.itemCount}개</td></tr>` : ""}
          <tr><td><b>에러</b></td><td>${params.error}</td></tr>
          <tr><td><b>시각</b></td><td>${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td></tr>
        </table>
      `,
    });
  } catch {
    console.error("[organize] 알림 이메일 발송 실패");
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const FEATURE_KEY = "extension_organize";
const MAX_ITEMS = 800;
const CHUNK_SIZE = 100;

type Item = { url: string; title: string };
type Category = { name: string; items: Item[] };

async function classifyChunk(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  chunk: Item[]
): Promise<Category[]> {
  const itemList = chunk
    .map((item, i) => {
      let domain = item.url;
      try {
        domain = new URL(item.url).hostname.replace(/^www\./, "");
      } catch {}
      const title = (item.title || "(없음)").slice(0, 40);
      return `${i + 1}. ${title} | ${domain}`;
    })
    .join("\n");

  const prompt = `다음 북마크를 의미적으로 카테고리로 분류해주세요.

[북마크]
${itemList}

[요구사항]
- 카테고리는 한국어, 3~8개
- 분류하기 어려운 항목은 "기타"
- 반드시 아래 JSON 형식으로만 응답

[출력 형식]
{ "categories": [{ "name": "카테고리명", "indices": [1, 2, 3] }] }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON 추출 실패");

  const parsed = JSON.parse(jsonMatch[0]) as {
    categories: { name: string; indices: number[] }[];
  };

  return parsed.categories.map((cat) => ({
    name: cat.name,
    items: (cat.indices ?? []).filter((i) => i >= 1 && i <= chunk.length).map((i) => chunk[i - 1]),
  }));
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  // 1. 인증
  const auth = await getUserFromBearer(request.headers.get("Authorization"));
  if (!auth) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const { user, supabase } = auth;

  const { items }: { items: Item[] } = await request.json();
  if (!items?.length) {
    return NextResponse.json(
      { success: false, message: "items가 필요합니다." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 2. 아이템 수 제한
  if (items.length > MAX_ITEMS) {
    await sendErrorAlert({
      userEmail: user.email ?? "unknown",
      situation: `북마크 수 초과 (${MAX_ITEMS}개 제한)`,
      error: `요청 수: ${items.length}개`,
      itemCount: items.length,
    });
    return NextResponse.json(
      { success: false, message: `한 번에 최대 ${MAX_ITEMS}개까지 정리할 수 있어요.` },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 3. 월 1회 사용 제한 확인 (개발용 계정은 무제한)
  const devEmails = (process.env.DEV_USER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isDev = devEmails.includes(user.email ?? "");

  if (!isDev) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("feature_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", FEATURE_KEY)
      .gte("used_at", startOfMonth.toISOString());

    if (count && count > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "이번 달 AI 정리는 이미 사용하셨어요. 다음 달에 다시 시도해주세요.",
          code: "MONTHLY_LIMIT_EXCEEDED",
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }
  }

  // 4. Gemini로 카테고리 분류 (청크 병렬 처리)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const chunks: Item[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE));
  }

  let categories: Category[];
  try {
    const chunkResults = await Promise.all(chunks.map((chunk) => classifyChunk(model, chunk)));

    const merged = new Map<string, Item[]>();
    for (const result of chunkResults) {
      for (const cat of result) {
        const existing = merged.get(cat.name) ?? [];
        merged.set(cat.name, [...existing, ...cat.items]);
      }
    }
    categories = Array.from(merged.entries()).map(([name, catItems]) => ({
      name,
      items: catItems,
    }));
  } catch (err) {
    console.error("[organize] Gemini API 오류:", err);
    const message = err instanceof Error ? err.message : String(err);
    const isQuotaError =
      message.includes("quota") ||
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED");
    await sendErrorAlert({
      userEmail: user.email ?? "unknown",
      situation: isQuotaError ? "Gemini API 토큰/할당량 초과" : "Gemini API 오류",
      error: message,
      itemCount: items.length,
    });
    return NextResponse.json(
      { success: false, message: `AI 분류 중 오류가 발생했어요: ${message}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // 5. 사용 기록 저장
  await supabase.from("feature_usage").insert({ user_id: user.id, feature: FEATURE_KEY });

  return NextResponse.json({ success: true, categories }, { headers: CORS_HEADERS });
}
