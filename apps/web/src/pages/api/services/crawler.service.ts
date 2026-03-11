import * as cheerio from "cheerio";
export type CrawlerErrorCode =
  | "FETCH_FAILED" // 사이트 자체 접근 불가
  | "PARSE_FAILED" // HTML 파싱 실패
  | "TITLE_NOT_FOUND" // title 없음 → AI fallback
  | "DESCRIPTION_NOT_FOUND" // description 없음 → AI fallback
  | "BODY_NOT_FOUND" // 본문 없음 → AI 호출 불가
  | "UNKNOWN_ERROR";

export interface CrawlResult {
  title: string | null;
  description: string | null;
  thumbnailUrl: string;
  success: boolean;
  status: "completed" | "manual_required";
  attempt: number;
  errorCode?: CrawlerErrorCode;
  bodyChunks?: [string, string, string]; // 본문 3등분, AI 호출 후 버림
}

/**
 * @description 서버 사이드 전용 URL 크롤링 서비스
 */
export class CrawlerService {
  private readonly MAX_RETRIES = 3;

  async crawl(url: string, attempt: number = 1): Promise<CrawlResult> {
    try {
      console.log(`[Crawler] 시도 ${attempt}/${this.MAX_RETRIES}: ${url} 분석 중...`);

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        return this.handleRetry(url, attempt, "FETCH_FAILED");
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $('meta[property="og:title"]').attr("content") || $("title").text() || "";

      const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        "";

      const thumbnailUrl = $('meta[property="og:image"]').attr("content") || "";

      if (!title) {
        return this.handleRetry(url, attempt, "TITLE_NOT_FOUND");
      }

      return {
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl,
        success: true,
        status: "completed",
        attempt,
      };
    } catch (error) {
      console.error(`[Crawler] ${attempt}회차 예외 발생:`, error);
      return this.handleRetry(url, attempt, "UNKNOWN_ERROR");
    }
  }

  private async handleRetry(
    url: string,
    attempt: number,
    errorCode: CrawlerErrorCode
  ): Promise<CrawlResult> {
    if (attempt < this.MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.crawl(url, attempt + 1);
    }

    return {
      title: "",
      description: "",
      thumbnailUrl: "",
      success: false,
      status: "manual_required",
      attempt: this.MAX_RETRIES,
      errorCode,
    };
  }
}

export const crawlerService = new CrawlerService();
