import { test, expect } from "@playwright/test";
import { loginAsGuest } from "./helpers";

// 비회원인데 브라우저에 저장된 임베딩이 하나도 없는 경우 (이 기능 전에 저장한 북마크뿐)
// 북마크는 localStorage에 직접 넣는다

const NOW = "2026-10-14T00:00:00.000Z";

const row = (id: string, title: string) => ({
  id,
  url: `https://example.com/${id}`,
  title,
  summary: `${title} 요약`,
  tags: [],
  aiStatus: "completed",
  status: "unread",
  guestId: "guest-e2e",
  createdAt: NOW,
  updatedAt: NOW,
});

test.describe("비회원 AI 의미 검색 - 임베딩 없음", () => {
  test("임베딩이 하나도 없는 비회원이 검색하면 의미 검색 서버를 부르지 않고 남은 횟수도 줄지 않으며, 대신 'AI 검색 준비하기' 버튼이 뜬다", async ({
    page,
  }) => {
    await loginAsGuest(page);
    await page.addInitScript(
      ({ bookmarks, today }) => {
        localStorage.setItem("GUEST_BOOKMARK", JSON.stringify(bookmarks));
        localStorage.removeItem("GUEST_BOOKMARK_EMBEDDING");
        localStorage.setItem("guest_semantic_usage", JSON.stringify({ date: today, count: 0 }));
      },
      {
        bookmarks: [row("old1", "예전 글 하나"), row("old2", "예전 글 둘")],
        today: new Date().toISOString().slice(0, 10),
      }
    );

    const semanticCalls: string[] = [];
    await page.route("**/api/semantic-search", (route) => {
      semanticCalls.push(route.request().url());
      return route.fulfill({
        json: { success: true, data: { mode: "guest", queryEmbedding: [1, 0] } },
      });
    });

    // 키워드로는 아무것도 안 걸리는 검색어
    await page.goto("/bookmarks?q=zzzz");

    await expect(page.getByRole("button", { name: "AI 검색 준비하기" })).toBeVisible();

    // 서버 호출 없음
    expect(semanticCalls).toHaveLength(0);

    // 남은 횟수 그대로 (사용 기록 count 0, 화면에 5회 남음)
    const usage = await page.evaluate(() => localStorage.getItem("guest_semantic_usage"));
    expect(JSON.parse(usage ?? '{"count":0}').count).toBe(0);
    await expect(page.getByText(/오늘 4회 남음/)).toHaveCount(0);
  });
});
