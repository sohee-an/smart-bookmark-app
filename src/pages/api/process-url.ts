import { NextApiRequest, NextApiResponse } from "next";
import { crawlerService } from "./services/crawler.service";
import { aiService } from "./services/ai.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: "URL이 누락되었습니다." });
  }

  try {
    //  크롤링 시도 (내부적으로 최대 3회 재시도 및 에러 코드 처리)
    const crawlResult = await crawlerService.crawl(url);

    // 최종 크롤링 실패 시 (수동 입력 유도)
    if (crawlResult.status === "manual_required") {
      let message = "웹사이트 정보를 자동으로 가져올 수 없습니다.";

      if (crawlResult.errorCode === "FETCH_FAILED") {
        message = "URL을 열 수 없거나 잘못된 주소입니다. 주소를 다시 확인해 주세요.";
      } else if (crawlResult.errorCode === "TITLE_NOT_FOUND") {
        message = "사이트 제목을 추출할 수 없습니다. 보안이 강한 사이트일 수 있습니다.";
      } else if (crawlResult.errorCode === "UNKNOWN_ERROR") {
        message = "분석 중 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      }

      return res.status(200).json({
        success: false,
        status: "manual_required",
        attempt: crawlResult.attempt,
        errorCode: crawlResult.errorCode,
        message, // 구체적인 에러 메시지 반환
      });
    }

    //  크롤링 성공 시 AI 분석 수행
    const aiResult = await aiService.analyze(crawlResult.title, crawlResult.description);

    return res.status(200).json({
      success: true,
      status: "completed",
      attempt: crawlResult.attempt,
      data: {
        title: crawlResult.title,
        summary: aiResult.summary,
        tags: aiResult.tags,
        thumbnailUrl: crawlResult.thumbnailUrl,
      },
    });
  } catch (error) {
    console.error("[API Process URL] 알 수 없는 오류:", error);
    return res.status(500).json({
      success: false,
      status: "error",
      message: "분석 중 예기치 않은 오류가 발생했습니다.",
    });
  }
}
