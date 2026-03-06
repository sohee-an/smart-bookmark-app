import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

// 1. 설정: API 키 확인
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ .env.local 파일에 GEMINI_API_KEY를 설정해주세요.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// 코드 작성에는 지능이 높은 gemini-1.5-pro 모델을 추천합니다.
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.log('❓ 사용법: npm run ai "질문 내용"');
  process.exit(0);
}

async function askGemini() {
  console.log("🤖 Gemini가 생각 중입니다...");
  try {
    const fullPrompt = `당신은 Next.js(Page Router) 전문가입니다. 다음 요청에 대해 바로 복사해서 쓸 수 있는 코드와 간단한 설명을 제공하세요: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    console.log("\n--- 💡 Gemini의 답변 ---\n");
    console.log(response.text());
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

askGemini();
