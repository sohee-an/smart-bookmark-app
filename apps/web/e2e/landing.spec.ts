import { test, expect } from "@playwright/test";

test.describe("랜딩 페이지 크리티컬 플로우", () => {
  test("랜딩 페이지 로드 → 핵심 요소 표시", async ({ page }) => {
    await page.goto("/landing");

    // 로고
    await expect(page.getByText("SmartMark")).toBeVisible();

    // 히어로 텍스트
    await expect(page.getByText("진짜 가치")).toBeVisible();

    // CTA 버튼
    await expect(page.getByRole("link", { name: /시작하기/i })).toBeVisible();

    // 기능 카드 3개
    await expect(page.getByText("스마트 AI 요약")).toBeVisible();
    await expect(page.getByText("AI 의미 검색")).toBeVisible();
    await expect(page.getByText("태그 기반 필터")).toBeVisible();
  });

  test("시작하기 버튼 → 로그인 페이지 이동", async ({ page }) => {
    await page.goto("/landing");

    const ctaButton = page.getByRole("link", { name: /시작하기/i });
    await ctaButton.click();

    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("이미 계정이 있으신가요 → 로그인 페이지 이동", async ({ page }) => {
    await page.goto("/landing");

    const loginLink = page.getByText("이미 계정이 있으신가요?");
    await loginLink.click();

    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("모바일 뷰포트에서 랜딩 페이지 깨지지 않음", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/landing");

    // 핵심 요소 모바일에서도 표시
    await expect(page.getByText("SmartMark")).toBeVisible();
    await expect(page.getByText("진짜 가치")).toBeVisible();
    await expect(page.getByRole("link", { name: /시작하기/i })).toBeVisible();

    // 수평 스크롤 없음 확인
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
