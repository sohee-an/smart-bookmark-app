import { test, expect } from "@playwright/test";

test.describe("북마크 저장 크리티컬 플로우", () => {
  test.beforeEach(async ({ page }) => {
    // 게스트로 메인 페이지 접근
    await page
      .context()
      .addCookies([{ name: "is_guest", value: "true", domain: "localhost", path: "/" }]);
    await page.goto("/");
  });

  test("북마크 추가 버튼 클릭 → 모달 열림 → URL 입력 → 저장 → 카드 표시", async ({ page }) => {
    // 1. 추가 버튼 클릭
    const addButton = page.getByRole("button", { name: /북마크 추가/i });
    await addButton.click();

    // 2. 모달 열림 확인
    await expect(page.getByText("새 북마크 추가")).toBeVisible();

    // 3. URL 입력
    const urlInput = page.getByPlaceholder("https://example.com");
    await urlInput.fill("https://react.dev");

    // 4. 저장 클릭
    const saveButton = page.getByRole("button", { name: /북마크 저장/i });
    await saveButton.click();

    // 5. 모달 닫힘
    await expect(page.getByText("새 북마크 추가")).not.toBeVisible();

    // 6. 카드 표시 (crawling 상태로 즉시 표시됨)
    await expect(page.getByText("https://react.dev")).toBeVisible();
  });

  test("빈 URL 저장 시도 → 에러 메시지 표시", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /북마크 추가/i });
    await addButton.click();

    // URL 비운 채로 저장 시도
    const saveButton = page.getByRole("button", { name: /북마크 저장/i });
    await saveButton.click();

    // 모달이 닫히지 않고 에러 표시
    await expect(page.getByText("새 북마크 추가")).toBeVisible();
  });

  test("잘못된 URL 입력 → 에러 메시지 표시", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /북마크 추가/i });
    await addButton.click();

    const urlInput = page.getByPlaceholder("https://example.com");
    await urlInput.fill("not-a-valid-url");

    const saveButton = page.getByRole("button", { name: /북마크 저장/i });
    await saveButton.click();

    // 모달이 닫히지 않음 (에러 상태)
    await expect(page.getByText("새 북마크 추가")).toBeVisible();
  });

  test("모달 ESC로 닫기", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /북마크 추가/i });
    await addButton.click();

    await expect(page.getByText("새 북마크 추가")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByText("새 북마크 추가")).not.toBeVisible();
  });
});
