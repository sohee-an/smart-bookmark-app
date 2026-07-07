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
    await expect(page.getByRole("button", { name: /다시 시도/i })).toBeVisible({ timeout: 10000 });
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
    await expect(page.getByRole("button", { name: /다시 시도/i })).toBeVisible({ timeout: 10000 });
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

  test("네트워크 에러 (fetch 실패) → 에러 카드 표시", async ({ page }) => {
    // fetch 자체가 실패하도록 abort
    await page.route("**/api/crawl", (route) => route.abort("connectionrefused"));

    await page.goto("/");

    await page.getByRole("button", { name: /북마크 추가/i }).click();
    await page.getByPlaceholder("https://example.com").fill("https://network-error.example.com");
    await page.getByRole("button", { name: /북마크 저장/i }).click();

    await expect(page.getByText("새 북마크 추가")).not.toBeVisible();

    // 네트워크 에러는 catch 블록 → aiStatus: "failed"
    await expect(page.getByText("AI 요약에 실패했어요.")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /다시 시도/i })).toBeVisible({ timeout: 10000 });
  });

  test("진행중/실패 카드 클릭 시 상세 패널 열리지 않음", async ({ page }) => {
    // 크롤링을 영원히 pending 상태로 유지
    await page.route("**/api/crawl", () => {
      // 응답하지 않음 — 크롤링 중 상태 유지
    });

    await page.goto("/");

    await page.getByRole("button", { name: /북마크 추가/i }).click();
    await page.getByPlaceholder("https://example.com").fill("https://pending.example.com");
    await page.getByRole("button", { name: /북마크 저장/i }).click();

    // 크롤링 중 카드 표시
    await expect(page.getByText("크롤링 중...")).toBeVisible({ timeout: 10000 });

    // 크롤링 중 카드 클릭 시도
    await page.getByText("크롤링 중...").click();

    // 상세 패널 열리지 않음 — 패널 내부의 닫기 버튼(X)이나 URL 링크가 보이지 않아야 함
    await expect(page.getByRole("link", { name: /pending\.example\.com/i })).not.toBeVisible();
    // 짧은 대기 후에도 패널이 열리지 않는지 재확인
    await page.waitForTimeout(1000);
    await expect(page.getByRole("link", { name: /pending\.example\.com/i })).not.toBeVisible();
  });
});

test.describe("비회원 저장 한도", () => {
  test("비회원 저장 한도(20개) 초과 → 한도 초과 UI 표시", async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: "is_guest", value: "true", domain: "localhost", path: "/" }]);

    // localStorage에 한도(GUEST_BOOKMARK_LIMIT=20)만큼 미리 채우기
    await page.goto("/");
    await page.evaluate((limit) => {
      const bookmarks = Array.from({ length: limit }, (_, i) => ({
        id: `fake-${i}`,
        url: `https://example.com/${i}`,
        title: `북마크 ${i}`,
        summary: "",
        tags: [],
        aiStatus: "completed",
        status: "unread",
        guestId: "guest-test",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem("GUEST_BOOKMARK", JSON.stringify(bookmarks));
    }, 20);

    // 페이지 새로고침으로 localStorage 반영
    await page.reload();

    // 북마크 추가 시도
    await page.getByRole("button", { name: /북마크 추가/i }).click();
    await page.getByPlaceholder("https://example.com").fill("https://over-limit.example.com");
    await page.getByRole("button", { name: /북마크 저장/i }).click();

    // 한도 초과 UI 표시
    await expect(page.getByText("무료 체험 한도 도달")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /로그인 \/ 회원가입/i })).toBeVisible();
  });
});
