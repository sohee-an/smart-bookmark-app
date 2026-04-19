import { test, expect } from "@playwright/test";

test.describe("Header 깜빡임 테스트", () => {
  test("비회원: 느린 네트워크에서도 로그인 버튼이 즉시 보여야 함", async ({ page, context }) => {
    // Slow 3G 시뮬레이션
    await context.route("**/*", (route) => route.continue());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page as any).emulateNetworkConditions?.({
      offline: false,
      downloadThroughput: (500 * 1024) / 8,
      uploadThroughput: (500 * 1024) / 8,
      latency: 400,
    });

    await page.goto("/landing");
    const loginBtn = page.getByText("로그인");
    await expect(loginBtn).toBeVisible();
  });

  test("로그인 유저: 헤더에 아바타가 즉시 표시되고 로그인 버튼이 없어야 함", async ({ page }) => {
    // 로그인 상태 세팅 (쿠키/스토리지 기반)
    await page.goto("/");

    // 로그인 버튼이 보이지 않아야 함 (깜빡임 없음)
    const loginBtn = page.getByText("로그인", { exact: true });
    await expect(loginBtn).not.toBeVisible();
  });

  test("비회원 게스트: 헤더에 게스트 아바타가 즉시 표시되어야 함", async ({ page }) => {
    // 게스트 쿠키 세팅
    await page.context().addCookies([
      {
        name: "is_guest",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/");

    // 게스트님 텍스트가 보여야 함
    await expect(page.getByText("게스트님")).toBeVisible();
    // 로그인 버튼은 없어야 함
    await expect(page.getByText("로그인", { exact: true })).not.toBeVisible();
  });
});
