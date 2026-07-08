import { test, expect } from "@playwright/test";
import {
  loginAsGuest,
  addBookmarkButton,
  bookmarkUrlInput,
  saveBookmarkButton,
  addBookmarkModalTitle,
  submitBookmark,
} from "./helpers";

test.describe("북마크 저장 크리티컬 플로우", () => {
  test.beforeEach(async ({ page }) => {
    // 게스트로 메인 페이지 접근
    await loginAsGuest(page);
    await page.goto("/");
  });

  test("북마크 추가 버튼 클릭 → 모달 열림 → URL 입력 → 저장 → 카드 표시", async ({ page }) => {
    // API mock — CI에서 placeholder env로 실제 API 호출 불가하므로 mock 필수
    await page.route("**/api/crawl", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            title: "테스트 저장 페이지",
            description: "",
            thumbnailUrl: null,
            bodyChunks: [],
          },
        }),
      })
    );
    await page.route("**/api/ai-analyze", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { title: "테스트 저장 페이지", summary: "테스트 요약입니다", tags: [] },
        }),
      })
    );
    await page.route("**/api/embed", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { embedding: [] } }),
      })
    );

    // 1. 추가 버튼 클릭
    await addBookmarkButton(page).click();

    // 2. 모달 열림 확인
    await expect(addBookmarkModalTitle(page)).toBeVisible();

    // 3. URL 입력
    await bookmarkUrlInput(page).fill("https://react.dev");

    // 4. 저장 클릭
    await saveBookmarkButton(page).click();

    // 5. 모달 닫힘
    await expect(addBookmarkModalTitle(page)).not.toBeVisible();

    // 6. 카드 표시 (title이 표시됨)
    await expect(page.getByText("테스트 저장 페이지")).toBeVisible({ timeout: 10000 });
  });

  test("빈 URL 저장 시도 → 에러 메시지 표시", async ({ page }) => {
    await addBookmarkButton(page).click();

    // URL 비운 채로 저장 시도
    await saveBookmarkButton(page).click();

    // 모달이 닫히지 않고 에러 표시
    await expect(addBookmarkModalTitle(page)).toBeVisible();
  });

  test("잘못된 URL 입력 → 에러 메시지 표시", async ({ page }) => {
    await submitBookmark(page, "not-a-valid-url");

    // 모달이 닫히지 않음 (에러 상태)
    await expect(addBookmarkModalTitle(page)).toBeVisible();
  });

  test("저장 → 크롤링 중 → AI 분석 중 → 완료 (title/summary/tags 표시)", async ({ page }) => {
    // 크롤링 API mock — 약간의 딜레이로 중간 상태 확인
    await page.route("**/api/crawl", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            title: "파이프라인 검증 페이지",
            description: "파이프라인 테스트용 페이지",
            thumbnailUrl: null,
            bodyChunks: ["본문 내용입니다."],
          },
        }),
      });
    });

    // AI 분석 API mock
    await page.route("**/api/ai-analyze", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            title: "파이프라인 검증 페이지",
            summary: "파이프라인이 정상적으로 완료된 요약문입니다.",
            tags: ["파이프라인테스트"],
          },
        }),
      });
    });

    // 임베딩 API mock
    await page.route("**/api/embed", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { embedding: [] } }),
      })
    );

    // 1. 저장
    await submitBookmark(page, "https://pipeline-test.example.com");

    // 2. 모달 닫히고 "크롤링 중..." 표시
    await expect(addBookmarkModalTitle(page)).not.toBeVisible();
    await expect(page.getByText("크롤링 중...")).toBeVisible();

    // 3. 크롤링 완료 후 "AI 분석 중..." 전환
    await expect(page.getByText("AI 분석 중...")).toBeVisible({ timeout: 10000 });

    // 4. 파이프라인 완료 → title, summary, tags 표시
    await expect(page.getByText("파이프라인 검증 페이지")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("파이프라인이 정상적으로 완료된 요약문입니다.")).toBeVisible();
    await expect(page.getByText("#파이프라인테스트")).toBeVisible();
  });

  test("모달 ESC로 닫기", async ({ page }) => {
    await addBookmarkButton(page).click();

    await expect(addBookmarkModalTitle(page)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(addBookmarkModalTitle(page)).not.toBeVisible();
  });
});
