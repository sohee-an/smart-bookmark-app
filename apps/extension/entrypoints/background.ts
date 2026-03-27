export default defineBackground(() => {
  // Side Panel: 아이콘 클릭 시 Side Panel 열기
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(console.error);

  // Context Menu 등록
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "save-selection",
      title: "SmartMark에 저장",
      contexts: ["selection", "page", "link"],
    });
  });

  // Context Menu 클릭 핸들러
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) return;

    if (info.menuItemId === "save-selection") {
      // 선택된 텍스트 or 현재 페이지 URL 저장
      const url = info.linkUrl ?? tab.url ?? "";
      const highlight = info.selectionText ?? "";
      chrome.storage.local.set({ pendingSave: { url, highlight } });
      // Popup 열기
      chrome.action.openPopup();
    }
  });

  // 키보드 단축키 핸들러
  chrome.commands.onCommand.addListener((command) => {
    if (command === "save-bookmark") {
      chrome.action.openPopup();
    }
  });

  // ⚠️ 로그인 플로우: 웹앱 로그인 완료 후 토큰 감지
  // Supabase PKCE는 fragment(#)로 토큰을 전달하므로 content script에서 처리 필요
  // URL 예: https://yourapp.com/auth/callback#access_token=xxx
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;

    const url = new URL(tab.url);
    if (!url.pathname.includes("/auth/callback")) return;

    // fragment(#) 파싱 — Supabase 기본 PKCE 흐름
    const fragmentParams = new URLSearchParams(url.hash.slice(1));
    const accessToken = fragmentParams.get("access_token") ?? url.searchParams.get("access_token");
    const refreshToken =
      fragmentParams.get("refresh_token") ?? url.searchParams.get("refresh_token");

    if (!accessToken) return;

    chrome.storage.local.set({ accessToken, refreshToken }, () => {
      chrome.tabs.remove(tabId);
    });
  });
});
