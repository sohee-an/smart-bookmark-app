import { test, expect } from "@playwright/test";
import { loginAsGuest } from "./helpers";

// 비회원 임베딩 채우기: 이 기능 전에 저장해 임베딩이 없는 북마크를 버튼으로 채운다
// 북마크와 임베딩은 localStorage에 직접 넣는다. 서버(검색어 임베딩, 북마크 임베딩)는 mock.
// 구현 전 작성한 테스트라 실패하는 게 정상이다 (안내 문구와 버튼이 아직 없다)

const NOW = "2026-10-14T00:00:00.000Z";

const row = (id: string, title: string, aiStatus = "completed") => ({
  id,
  url: `https://example.com/${id}`,
  title,
  summary: `${title} 요약`,
  tags: [],
  aiStatus,
  status: "unread",
  guestId: "guest-e2e",
  createdAt: NOW,
  updatedAt: NOW,
});

// 검색어 벡터 [1, 0]과 코사인 유사도가 s인 2차원 벡터 (앱의 encodeEmbedding과 같은 Float32 base64)
const encodedWithSimilarity = (s: number) =>
  Buffer.from(new Float32Array([s, Math.sqrt(1 - s * s)]).buffer).toString("base64");

test.describe("비회원 AI 의미 검색 - 임베딩 채우기", () => {
  test("AI 처리는 끝났지만 임베딩이 없는 비회원 북마크(이 기능 전에 저장한 것)가 있으면 의미 검색 결과 위에 '북마크 N개는 아직 AI 검색에 안 잡혀요' 안내와 'AI 검색 준비하기' 버튼이 뜬다. 누르면 그 북마크들의 임베딩을 제목과 요약으로 만들어 저장하고, 같은 검색어 결과에 다시 반영한다. 하루 검색 횟수는 줄지 않는다", async ({
    page,
  }) => {
    await loginAsGuest(page);
    await page.addInitScript(
      ({ bookmarks, embeddings, today }) => {
        // 채우기 후 새로고침 없이 값을 보려고, 최초 한 번만 심는다
        if (localStorage.getItem("__seeded")) return;
        localStorage.setItem("__seeded", "1");
        localStorage.setItem("GUEST_BOOKMARK", JSON.stringify(bookmarks));
        localStorage.setItem("GUEST_BOOKMARK_EMBEDDING", JSON.stringify(embeddings));
        localStorage.setItem("guest_semantic_usage", JSON.stringify({ date: today, count: 0 }));
      },
      {
        bookmarks: [
          row("indexed", "이미 검색되는 글"),
          row("old1", "예전 글 하나"),
          row("old2", "예전 글 둘"),
          // AI 처리가 안 끝난 것은 세지 않는다
          row("pending", "아직 처리 중인 글", "processing"),
        ],
        embeddings: { indexed: encodedWithSimilarity(0.9) },
        today: new Date().toISOString().slice(0, 10),
      }
    );

    // 검색어 임베딩 [1, 0]
    await page.route("**/api/semantic-search", (route) =>
      route.fulfill({
        json: { success: true, data: { mode: "guest", queryEmbedding: [1, 0] } },
      })
    );
    // 북마크 임베딩: 요청 본문을 모으고, 검색어와 유사도 0.85인 벡터를 돌려준다
    const embedBodies: Array<{ title?: string; summary?: string }> = [];
    await page.route("**/api/embed", (route) => {
      embedBodies.push(route.request().postDataJSON());
      return route.fulfill({
        json: { success: true, data: { embedding: [0.85, Math.sqrt(1 - 0.85 * 0.85)] } },
      });
    });

    await page.goto("/bookmarks?q=zzzz");

    // 안내와 버튼 (처리 중인 북마크는 세지 않아 2개)
    await expect(page.getByText("북마크 2개는 아직 AI 검색에 안 잡혀요")).toBeVisible();
    const button = page.getByRole("button", { name: "AI 검색 준비하기" });
    await expect(button).toBeVisible();
    await expect(page.getByText("예전 글 하나")).toHaveCount(0);

    // 누르기 전 사용 횟수 (이미 검색 한 번으로 1회 썼다)
    const readCount = async () =>
      JSON.parse((await page.evaluate(() => localStorage.getItem("guest_semantic_usage"))) ?? "{}")
        .count as number;
    await expect.poll(readCount).toBe(1);

    await button.click();

    // 제목과 요약으로 임베딩을 만든다
    await expect.poll(() => embedBodies.length).toBe(2);
    expect(embedBodies).toEqual(
      expect.arrayContaining([
        { title: "예전 글 하나", summary: "예전 글 하나 요약" },
        { title: "예전 글 둘", summary: "예전 글 둘 요약" },
      ])
    );

    // 브라우저에 저장된다 (처리 중인 북마크는 제외)
    await expect
      .poll(async () =>
        Object.keys(
          JSON.parse(
            (await page.evaluate(() => localStorage.getItem("GUEST_BOOKMARK_EMBEDDING"))) ?? "{}"
          )
        ).sort()
      )
      .toEqual(["indexed", "old1", "old2"]);

    // 같은 검색어 결과에 반영되고 안내는 사라진다
    await expect(page).toHaveURL(/q=zzzz/);
    await expect(page.getByText("예전 글 하나").first()).toBeVisible();
    await expect(page.getByText("예전 글 둘").first()).toBeVisible();
    await expect(page.getByText("북마크 2개는 아직 AI 검색에 안 잡혀요")).toHaveCount(0);

    // 하루 검색 횟수는 줄지 않는다
    expect(await readCount()).toBe(1);
    await expect(page.getByText(/오늘 4회 남음/)).toBeVisible();
  });
});
