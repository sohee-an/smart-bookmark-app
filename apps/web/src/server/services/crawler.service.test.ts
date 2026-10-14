import { afterEach, describe, expect, it, vi } from "vitest";
import { CrawlerService, resolveCrawlUrl } from "./crawler.service";

// 크롤링 테스트는 네트워크와 DNS를 쓰지 않는다. SSRF 검증은 통과한 것으로 두고 fetch는 가짜 HTML을 돌려준다
vi.mock("@/shared/lib/validateSsrf", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/shared/lib/validateSsrf")>();
  return { ...mod, validateSsrf: vi.fn().mockResolvedValue(undefined) };
});

describe("resolveCrawlUrl — iframe 래퍼 사이트 크롤링 대상 치환", () => {
  it("네이버 블로그 글 URL을 PostView로 치환한다", () => {
    expect(resolveCrawlUrl("https://blog.naver.com/megkdk0723/223256292281")).toBe(
      "https://blog.naver.com/PostView.naver?blogId=megkdk0723&logNo=223256292281"
    );
  });

  it("모바일 네이버 블로그도 치환한다", () => {
    expect(resolveCrawlUrl("https://m.blog.naver.com/someone/1234567890")).toBe(
      "https://blog.naver.com/PostView.naver?blogId=someone&logNo=1234567890"
    );
  });

  it("끝 슬래시가 있어도 치환한다", () => {
    expect(resolveCrawlUrl("https://blog.naver.com/abc_def-1/111/")).toBe(
      "https://blog.naver.com/PostView.naver?blogId=abc_def-1&logNo=111"
    );
  });

  it("글 번호가 아닌 네이버 블로그 경로(홈 등)는 치환하지 않는다", () => {
    expect(resolveCrawlUrl("https://blog.naver.com/megkdk0723")).toBe(
      "https://blog.naver.com/megkdk0723"
    );
    expect(resolveCrawlUrl("https://blog.naver.com/PostView.naver?blogId=a&logNo=1")).toBe(
      "https://blog.naver.com/PostView.naver?blogId=a&logNo=1"
    );
  });

  it("네이버 블로그가 아닌 URL은 그대로 반환한다", () => {
    expect(resolveCrawlUrl("https://example.com/megkdk0723/223256292281")).toBe(
      "https://example.com/megkdk0723/223256292281"
    );
    expect(resolveCrawlUrl("https://blog.naver.com.evil.com/a/1")).toBe(
      "https://blog.naver.com.evil.com/a/1"
    );
  });

  it("파싱 불가능한 문자열은 그대로 반환한다", () => {
    expect(resolveCrawlUrl("not-a-url")).toBe("not-a-url");
  });
});

describe("crawl — 제목 추출", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const html = (body: string) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html" } });

  it("본문 SVG 안의 <title>은 제목에 섞이지 않는다 (첫 번째 <title>만 쓴다)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        html(`<html><head><title>JavaScript | MDN</title></head>
          <body><svg><title>MDN</title></svg><svg><title>Mozilla</title></svg>
          <p>${"본문 ".repeat(50)}</p></body></html>`)
      )
    );

    const result = await new CrawlerService().crawl("https://example.com/page");

    expect(result.success).toBe(true);
    expect(result.title).toBe("JavaScript | MDN");
  });

  it("og:title이 있으면 그것을 우선한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        html(`<html><head><meta property="og:title" content="OG 제목"><title>태그 제목</title></head>
          <body><p>${"본문 ".repeat(50)}</p></body></html>`)
      )
    );

    const result = await new CrawlerService().crawl("https://example.com/page");

    expect(result.title).toBe("OG 제목");
  });
});
