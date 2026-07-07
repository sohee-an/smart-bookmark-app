import { describe, expect, it } from "vitest";
import { resolveCrawlUrl } from "./crawler.service";

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
