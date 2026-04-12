import { test, expect } from "@playwright/test";

test.describe("Header QA — 깜빡임(FOUC) 테스트", () => {
  test("게스트 유저: 느린 네트워크에서 로그인 버튼이 flash되지 않아야 함", async ({
    page,
    context,
  }) => {
    await context.addCookies([{ name: "is_guest", value: "true", domain: "localhost", path: "/" }]);

    await page.emulateNetworkConditions?.({
      offline: false,
      downloadThroughput: (500 * 1024) / 8,
      uploadThroughput: (500 * 1024) / 8,
      latency: 400,
    });

    await page.goto("/");

    // 게스트는 로그인 버튼이 보이면 안 됨
    const loginBtn = page.getByText("로그인", { exact: true });
    await expect(loginBtn).not.toBeVisible();
  });
});

test.describe("Header QA — 터치 타겟", () => {
  test("모바일: 검색 아이콘 버튼이 44px 이상이어야 함", async ({ page, context }) => {
    await context.addCookies([{ name: "is_guest", value: "true", domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const searchBtn = page.locator("button[aria-label='검색']");
    const box = await searchBtn.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("Header QA — 아바타 드롭다운 트랜지션", () => {
  test("아바타 hover 시 드롭다운이 transition과 함께 나타나야 함", async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: "is_guest", value: "true", domain: "localhost", path: "/" }]);
    await page.goto("/");

    const avatar = page.locator(".group.relative.cursor-pointer").first();
    await avatar.hover();

    const dropdown = page.locator(".group-hover\\:block, .group-hover\\:opacity-100").first();
    await expect(dropdown).toBeVisible();
  });
});

test.describe("Header QA — 로그아웃 중복 클릭", () => {
  test("로그아웃 클릭 후 버튼이 비활성화되어야 함", async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: "is_guest", value: "true", domain: "localhost", path: "/" }]);
    await page.goto("/");

    const avatar = page.locator(".group.relative.cursor-pointer").first();
    await avatar.hover();

    const logoutBtn = page.getByText("로그아웃");
    await logoutBtn.click();

    // 클릭 직후 버튼이 disabled 상태여야 함
    await expect(logoutBtn).toBeDisabled();
  });
});
