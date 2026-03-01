import * as cheerio from "cheerio";

export type CrawlerErrorCode = "FETCH_FAILED" | "TITLE_NOT_FOUND" | "UNKNOWN_ERROR";

export interface CrawlResult {
  title: string;
  description: string;
  thumbnailUrl: string;
  success: boolean;
  status: "completed" | "manual_required";
  attempt: number;
  errorCode?: CrawlerErrorCode;
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        return this.handleRetry(url, attempt, "FETCH_FAILED");
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const title = 
        $('meta[property="og:title"]').attr("content") || 
        $("title").text() || 
        "";

      const description = 
        $('meta[property="og:description"]').attr("content") || 
        $('meta[name="description"]').attr("content") || 
        "";

      const thumbnailUrl = 
        $('meta[property="og:image"]').attr("content") || 
        "";

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

  private async handleRetry(url: string, attempt: number, errorCode: CrawlerErrorCode): Promise<CrawlResult> {
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
