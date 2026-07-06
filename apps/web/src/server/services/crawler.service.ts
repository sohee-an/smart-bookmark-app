import * as cheerio from "cheerio";
import { validateSsrf, SsrfError } from "@/shared/lib/validateSsrf";

export type CrawlerErrorCode =
  | "FETCH_FAILED"
  | "PARSE_FAILED"
  | "TITLE_NOT_FOUND"
  | "DESCRIPTION_NOT_FOUND"
  | "BODY_NOT_FOUND"
  | "UNKNOWN_ERROR";

export interface CrawlResult {
  title: string | null;
  description: string | null;
  thumbnailUrl: string;
  success: boolean;
  status: "completed" | "manual_required";
  attempt: number;
  errorCode?: CrawlerErrorCode;
  bodyChunks?: [string, string, string];
}

/**
 * @description 서버 사이드 전용 URL 크롤링 서비스
 */
export class CrawlerService {
  private readonly MAX_RETRIES = 3;

  private static readonly USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
  private static readonly MAX_REDIRECTS = 5;

  async crawl(url: string, attempt: number = 1): Promise<CrawlResult> {
    try {
      const { response, finalUrl } = await this.safeFetch(url);

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
      const rawThumbnail = $('meta[property="og:image"]').attr("content") || "";
      const thumbnailUrl = await this.resolveSafeThumbnail(rawThumbnail, finalUrl);

      // bodyChunks 추출을 title 체크 전에 수행
      const bodyText = $("p, article, main").text().replace(/\s+/g, " ").trim();
      let bodyChunks: [string, string, string] | undefined;
      if (bodyText.length > 0) {
        const chunkSize = Math.ceil(bodyText.length / 3);
        bodyChunks = [
          bodyText.slice(0, chunkSize),
          bodyText.slice(chunkSize, chunkSize * 2),
          bodyText.slice(chunkSize * 2),
        ];
      }

      // title 없어도 bodyChunks 있으면 AI가 생성 — success로 반환
      if (!title && !bodyChunks) {
        return this.handleRetry(url, attempt, "TITLE_NOT_FOUND");
      }

      return {
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl,
        success: true,
        status: "completed",
        attempt,
        bodyChunks,
      };
    } catch (error) {
      if (error instanceof SsrfError) {
        // SSRF 차단(내부망/위험 스킴/과도한 리다이렉트)은 재시도해도 결과가 같으므로 즉시 실패
        console.error(`[Crawler] SSRF 차단: ${url} — ${error.message}`);
        return {
          title: "",
          description: "",
          thumbnailUrl: "",
          success: false,
          status: "manual_required",
          attempt,
          errorCode: "FETCH_FAILED",
        };
      }
      console.error(`[Crawler] ${attempt}회차 예외 발생:`, error);
      return this.handleRetry(url, attempt, "UNKNOWN_ERROR");
    }
  }

  /**
   * SSRF 방어 fetch: 최초 URL과 모든 리다이렉트 홉을 validateSsrf로 검증하며
   * 수동으로 따라간다. 기본 redirect:"follow"는 검증 통과 후 내부망으로
   * 튕겨지는 우회를 허용하므로 반드시 "manual"로 홉마다 재검증한다.
   */
  private async safeFetch(initialUrl: string): Promise<{ response: Response; finalUrl: string }> {
    let currentUrl = initialUrl;

    for (let hop = 0; hop <= CrawlerService.MAX_REDIRECTS; hop++) {
      await validateSsrf(currentUrl);

      const response = await fetch(currentUrl, {
        redirect: "manual",
        headers: { "User-Agent": CrawlerService.USER_AGENT },
      });

      const isRedirect = response.status >= 300 && response.status < 400;
      const location = response.headers.get("location");
      if (isRedirect && location) {
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      return { response, finalUrl: currentUrl };
    }

    throw new SsrfError("리다이렉트가 너무 많습니다.");
  }

  /**
   * og:image는 크롤링된 외부 입력이므로 원본 북마크 URL과 동일한 SSRF 검증을
   * 통과한 경우에만 사용한다. 실패 시 썸네일을 버려 next/image 프록시를 통한
   * 내부망 요청을 차단한다.
   */
  private async resolveSafeThumbnail(raw: string, baseUrl: string): Promise<string> {
    if (!raw) return "";

    let absolute: string;
    try {
      absolute = new URL(raw, baseUrl).href;
    } catch {
      return "";
    }

    try {
      await validateSsrf(absolute);
      return absolute;
    } catch {
      return "";
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
