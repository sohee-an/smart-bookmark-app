import { test, expect } from "@playwright/test";

test.describe("파이프라인 실패 단계별 피드백", () => {
  test.beforeEach(async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: "is_guest", value: "true", domain: "localhost", path: "/" }]);
  });

  test("크롤링 실패 → 에러 카드 + 재시도 버튼 표시", async ({ page }) => {
    // /api/crawl 실패 응답 mock
    await page.route("**/api/crawl", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          status: "manual_required",
          errorCode: "FETCH_FAILED",
          message: "URL을 열 수 없거나 잘못된 주소입니다.",
        }),
      })
    );

    await page.goto("/");

    // 북마크 저장
    await page.getByRole("button", { name: /북마크 추가/i }).click();
    await page.getByPlaceholder("https://example.com").fill("https://fail-crawl.example.com");
    await page.getByRole("button", { name: /북마크 저장/i }).click();

    // 모달 닫히고 카드 표시
    await expect(page.getByText("새 북마크 추가")).not.toBeVisible();

    // 크롤링 실패 에러 메시지 표시
    await expect(page.getByText("URL을 불러오는데 실패했어요.")).toBeVisible({ timeout: 10000 });

    // 재시도 버튼 존재
    await expect(page.getByRole("button", { name: /다시 시도/i })).toBeVisible();
  });

  test("AI 분석 실패 → 에러 카드 표시 (크롤링은 성공)", async ({ page }) => {
    // /api/crawl 성공 응답
    await page.route("**/api/crawl", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            title: "테스트 페이지",
            description: "테스트 설명",
            thumbnailUrl: null,
            bodyChunks: ["본문 내용"],
          },
        }),
      })
    );

    // /api/ai-analyze 실패 응답
    await page.route("**/api/ai-analyze", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "AI 분석 중 예기치 않은 오류가 발생했습니다.",
        }),
      })
    );

    await page.goto("/");

    await page.getByRole("button", { name: /북마크 추가/i }).click();
    await page.getByPlaceholder("https://example.com").fill("https://ai-fail.example.com");
    await page.getByRole("button", { name: /북마크 저장/i }).click();

    await expect(page.getByText("새 북마크 추가")).not.toBeVisible();

    // 크롤링 성공 후 AI 분석 중 → 실패 전환
    // "AI 분석 중..." 로딩이 잠깐 보이고 나서 실패로 전환
    await expect(page.getByText("AI 요약에 실패했어요.")).toBeVisible({ timeout: 10000 });

    // 재시도 버튼 존재
    await expect(page.getByRole("button", { name: /다시 시도/i })).toBeVisible();
  });

  test("크롤링 실패 → 재시도 → 성공 시 카드 정상 표시", async ({ page }) => {
    let crawlCallCount = 0;

    // 첫 번째 호출은 실패, 두 번째는 성공
    await page.route("**/api/crawl", (route) => {
      crawlCallCount++;
      if (crawlCallCount === 1) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            status: "manual_required",
            errorCode: "FETCH_FAILED",
            message: "URL을 열 수 없거나 잘못된 주소입니다.",
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            title: "재시도 성공 페이지",
            description: "재시도 후 성공한 페이지",
            thumbnailUrl: null,
            bodyChunks: ["본문"],
          },
        }),
      });
    });

    await page.route("**/api/ai-analyze", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            title: "재시도 성공 페이지",
            summary: "재시도 후 AI가 분석한 요약",
            tags: ["테스트"],
          },
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

    await page.goto("/");

    // 저장 → 크롤링 실패
    await page.getByRole("button", { name: /북마크 추가/i }).click();
    await page.getByPlaceholder("https://example.com").fill("https://retry-test.example.com");
    await page.getByRole("button", { name: /북마크 저장/i }).click();

    await expect(page.getByText("URL을 불러오는데 실패했어요.")).toBeVisible({ timeout: 10000 });

    // 재시도 클릭
    await page.getByRole("button", { name: /다시 시도/i }).click();

    // 재시도 성공 → AI 완료 → 요약 표시
    await expect(page.getByText("재시도 후 AI가 분석한 요약")).toBeVisible({ timeout: 10000 });
  });

  test("재시도 3회 초과 → 재시도 버튼 사라지고 초과 메시지 표시", async ({ page }) => {
    // 항상 크롤링 실패
    await page.route("**/api/crawl", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          status: "manual_required",
          errorCode: "FETCH_FAILED",
          message: "URL을 열 수 없거나 잘못된 주소입니다.",
        }),
      })
    );

    await page.goto("/");

    // 저장
    await page.getByRole("button", { name: /북마크 추가/i }).click();
    await page.getByPlaceholder("https://example.com").fill("https://always-fail.example.com");
    await page.getByRole("button", { name: /북마크 저장/i }).click();

    // 크롤링 실패 대기
    await expect(page.getByText("URL을 불러오는데 실패했어요.")).toBeVisible({ timeout: 10000 });

    // 재시도 3회
    for (let i = 0; i < 3; i++) {
      const retryButton = page.getByRole("button", { name: /다시 시도/i });
      await expect(retryButton).toBeVisible({ timeout: 10000 });
      await retryButton.click();
      await expect(page.getByText("URL을 불러오는데 실패했어요.")).toBeVisible({ timeout: 10000 });
    }

    // 4번째 시도 → 재시도 횟수 초과 메시지
    await expect(page.getByText("재시도 횟수를 초과했어요.")).toBeVisible({ timeout: 10000 });

    // 재시도 버튼 사라짐
    await expect(page.getByRole("button", { name: /다시 시도/i })).not.toBeVisible();
  });
});
