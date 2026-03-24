import { NextResponse } from "next/server";
import { crawlerService } from "@/server/services/crawler.service";

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ message: "URL이 누락되었습니다." }, { status: 400 });
  }

  try {
    const crawlResult = await crawlerService.crawl(url);
    console.log("cc", crawlResult);

    if (crawlResult.status === "manual_required") {
      let message = "웹사이트 정보를 자동으로 가져올 수 없습니다.";

      if (crawlResult.errorCode === "FETCH_FAILED") {
        message = "URL을 열 수 없거나 잘못된 주소입니다. 주소를 다시 확인해 주세요.";
      } else if (crawlResult.errorCode === "TITLE_NOT_FOUND") {
        message = "사이트 제목을 추출할 수 없습니다. 보안이 강한 사이트일 수 있습니다.";
      } else if (crawlResult.errorCode === "UNKNOWN_ERROR") {
        message = "분석 중 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      }

      return NextResponse.json({
        success: false,
        status: "manual_required",
        attempt: crawlResult.attempt,
        errorCode: crawlResult.errorCode,
        message,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        title: crawlResult.title,
        description: crawlResult.description,
        thumbnailUrl: crawlResult.thumbnailUrl,
        bodyChunks: crawlResult.bodyChunks,
      },
    });
  } catch (error) {
    console.error("[API Crawl] 오류:", error);
    return NextResponse.json(
      { success: false, message: "크롤링 중 예기치 않은 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
