import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserFromBearer, CORS_HEADERS } from "../_lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const FEATURE_KEY = "extension_organize";
const MAX_ITEMS = 800;

type Item = { url: string; title: string };
type Category = { name: string; items: Item[] };

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

  // 4. Gemini로 카테고리 분류
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const itemList = items
    .map((item, i) => `${i + 1}. 제목: ${item.title || "(없음)"} | URL: ${item.url}`)
    .join("\n");

  const prompt = `다음 북마크 목록을 의미적으로 관련된 카테고리로 분류해주세요.

[북마크 목록]
${itemList}

[요구사항]
- 카테고리는 한국어로, 3~8개가 적당합니다.
- 중복 URL은 하나만 남겨주세요.
- 분류하기 어려운 항목은 "기타" 카테고리로 묶어주세요.
- 반드시 아래 JSON 형식으로만 응답하세요.

[출력 형식]
{ "categories": [{ "name": "카테고리명", "items": [{ "url": "URL", "title": "제목" }] }] }`;

  let parsed: { categories: Category[] };
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[organize] Gemini 응답에서 JSON 추출 실패. 원문:", text);
      return NextResponse.json(
        { success: false, message: "AI가 올바른 형식으로 응답하지 않았어요. 다시 시도해주세요." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    parsed = JSON.parse(jsonMatch[0]) as { categories: Category[] };
  } catch (err) {
    console.error("[organize] Gemini API 오류:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: `AI 분류 중 오류가 발생했어요: ${message}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // 5. 사용 기록 저장
  await supabase.from("feature_usage").insert({ user_id: user.id, feature: FEATURE_KEY });

  return NextResponse.json(
    { success: true, categories: parsed.categories },
    { headers: CORS_HEADERS }
  );
}
