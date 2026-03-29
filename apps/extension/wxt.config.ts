import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "SmartMark",
    description: "AI가 자동으로 요약, 태그, 의미 검색을 해주는 북마크 앱",
    version: "0.1.0",
    permissions: ["storage", "tabs", "activeTab", "contextMenus", "sidePanel", "bookmarks"],
    action: {
      default_popup: "popup/index.html",
      default_icon: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png",
      },
    },
    side_panel: {
      default_path: "sidepanel/index.html",
    },
    commands: {
      "save-bookmark": {
        suggested_key: {
          default: "Alt+Shift+B",
        },
        description: "현재 페이지를 북마크에 저장",
      },
    },
  },
});
