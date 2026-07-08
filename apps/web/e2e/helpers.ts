import type { Page, Locator } from "@playwright/test";
import { GUEST_COOKIE } from "../src/shared/lib/guestCookie";

// 게스트 쿠키 세팅 — 쿠키 이름은 소스의 GUEST_COOKIE를 그대로 사용해 드리프트를 차단한다
export async function loginAsGuest(page: Page): Promise<void> {
  await page
    .context()
    .addCookies([{ name: GUEST_COOKIE, value: "true", domain: "localhost", path: "/" }]);
}

// 공용 셀렉터 — UI 라벨이 바뀌면 여기 한 곳만 수정한다
export const addBookmarkButton = (page: Page): Locator =>
  page.getByRole("button", { name: "북마크 추가", exact: true });

export const bookmarkUrlInput = (page: Page): Locator =>
  page.getByPlaceholder("https://example.com");

export const saveBookmarkButton = (page: Page): Locator =>
  page.getByRole("button", { name: /북마크 저장/i });

export const addBookmarkModalTitle = (page: Page): Locator => page.getByText("새 북마크 추가");

export const retryButton = (page: Page): Locator =>
  page.getByRole("button", { name: /다시 시도/i });

// 모달 열기 → URL 입력 → 저장 클릭 공통 플로우
export async function submitBookmark(page: Page, url: string): Promise<void> {
  await addBookmarkButton(page).click();
  await bookmarkUrlInput(page).fill(url);
  await saveBookmarkButton(page).click();
}
