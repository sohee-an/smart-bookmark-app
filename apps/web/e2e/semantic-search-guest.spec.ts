import { test, expect, type Page } from "@playwright/test";
import { loginAsGuest } from "./helpers";

// 비회원 AI 의미 검색: 서버는 검색어 임베딩만 주고(여기서는 mock), 브라우저가 저장된 임베딩과 비교한다.
// 북마크와 임베딩은 localStorage에 직접 넣는다 (실제 저장 흐름은 bookmark-save.spec.ts가 본다)

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

// 검색어 벡터 [1, 0]과 코사인 유사도가 s인 2차원 벡터를 Float32 base64로 (앱의 encodeEmbedding과 같은 형식)
const encodedWithSimilarity = (s: number) =>
  Buffer.from(new Float32Array([s, Math.sqrt(1 - s * s)]).buffer).toString("base64");

async function seedGuest(page: Page, usage = 0) {
  await loginAsGuest(page);
  await page.addInitScript(
    ({ bookmarks, embeddings, usage }) => {
      localStorage.setItem("GUEST_BOOKMARK", JSON.stringify(bookmarks));
      localStorage.setItem("GUEST_BOOKMARK_EMBEDDING", JSON.stringify(embeddings));
      localStorage.setItem(
        "guest_semantic_usage",
        JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: usage })
      );
    },
    {
      bookmarks: [row("close", "가까운 글"), row("near", "비슷한 글"), row("far", "먼 글")],
      embeddings: {
        close: encodedWithSimilarity(0.9),
        near: encodedWithSimilarity(0.7),
        far: encodedWithSimilarity(0.3),
      },
      usage,
    }
  );
  // 서버는 검색어 임베딩만 돌려준다
  await page.route("**/api/semantic-search", (route) =>
    route.fulfill({
      json: { success: true, data: { mode: "guest", queryEmbedding: [1, 0] } },
    })
  );
}

test.describe("비회원 AI 의미 검색", () => {
  test("비회원도 의미 검색 결과를 정확한/연관된 결과로 나눠 보고, 남은 횟수가 줄어든다", async ({
    page,
  }) => {
    await seedGuest(page);
    // 키워드로는 아무것도 안 걸리는 검색어 → 의미 검색 결과만 보인다
    await page.goto("/bookmarks?q=zzzz");

    await expect(page.getByText("정확한 결과 (1)")).toBeVisible();
    await expect(page.getByText("연관된 결과 (1)")).toBeVisible();
    await expect(page.getByText("가까운 글").first()).toBeVisible();
    await expect(page.getByText("먼 글")).toHaveCount(0);
    await expect(page.getByText(/오늘 4회 남음/)).toBeVisible();
  });

  test("하루 5회를 다 쓰면 서버를 부르지 않고 로그인 안내가 보인다", async ({ page }) => {
    await seedGuest(page, 5);
    let called = false;
    page.on("request", (r) => {
      if (r.url().includes("/api/semantic-search")) called = true;
    });

    await page.goto("/bookmarks?q=zzzz");

    await expect(page.getByText("오늘 무료 AI 의미 검색을 다 썼어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인하기" })).toBeVisible();
    expect(called).toBe(false);
  });
});
