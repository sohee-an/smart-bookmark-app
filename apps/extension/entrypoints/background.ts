import { supabase } from "../lib/supabase";

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

  // 구글 로그인 후 /auth/extension-token 페이지에서 토큰 감지
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;

    const url = new URL(tab.url);
    if (!url.pathname.includes("/auth/extension-token")) return;
    if (!url.hash) return;

    const params = new URLSearchParams(url.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken) return;

    supabase.auth.refreshSession({ refresh_token: refreshToken ?? "" }).then(({ error }) => {
      if (error) {
        console.error("[SmartMark] session refresh failed:", error.message);
        return;
      }
      chrome.tabs.remove(tabId);
      chrome.storage.local.get("returnToTabId", ({ returnToTabId }) => {
        if (returnToTabId) {
          chrome.tabs.update(returnToTabId, { active: true });
          chrome.storage.local.remove("returnToTabId");
        }
      });
    });
  });
});
