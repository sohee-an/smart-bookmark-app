### Mainifest V3가 무엇인가

익스텐션의 신분증이자 설정 파일이다. 브라우저가 이 파일을 읽고 "이 익스텐션이 물 하는 애구나" 라는 걸 파악한다.
파일명은 mainfest.json 이고 프로젝트 루트에 위치해야된다.

최소구성

```json
{
  "manifest_version": 3,
  "name": "SmartMark",
  "version": "1.0.0",
  "description": "AI 북마크 익스텐션"
}
- 아이콘들
{
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
익스텐션이 쓸 기능을 미리 선언해아 함 안하면 에러남
{
  "permissions": [
    "storage",       // chrome.storage.local 사용
    "tabs",          // 현재 탭 URL 읽기
    "contextMenus",  // 우클릭 메뉴 추가
    "sidePanel"      // 사이드패널 사용
  ]
}

이 익스텐션이 모든 웹사이트에 접근해도 되냐 라는 부분
{
  "permissions": ["storage", "tabs"],     // 설치 시 자동 허용
  "host_permissions": ["<all_urls>"]      // 모든 사이트 접근 (민감)
}
```

**2. Extension 컨텍스트 구분** (핵심)
익스텐션에서 제일 헷갈리는 부분이에요.

```
popup        → 아이콘 클릭 시 뜨는 UI
background   → 항상 떠있는 Service Worker (탭 감지, 이벤트 처리)
content      → 실제 웹페이지 안에 주입되는 스크립트
sidepanel    → 옆에 붙는 패널 UI
```

이 4개가 서로 독립된 컨텍스트라 **메시지로 통신**해야 해요.

**3. chrome API** (그때그때 찾아보면 됨)

- `chrome.storage.local` — 데이터 저장
- `chrome.tabs` — 탭 제어
- `chrome.contextMenus` — 우클릭 메뉴
- `chrome.sidePanel` — 사이드패널
- `chrome.runtime.sendMessage` — 컨텍스트 간 통신

**4. WXT 프레임워크 문서** (설정 관련)
wxt.dev 공식 문서 보면서 세팅하면 됨.

---

**기존 지식 그대로 쓰는 것들**

- React → popup, sidepanel UI 그대로
- Supabase 클라이언트 호출 → 동일
- TypeScript → 동일
- Turborepo → 동일

---

**학습 순서 추천**

```
1. WXT 공식 문서 quickstart (30분)
2. Manifest V3 권한 개념 (30분)
3. 컨텍스트 간 메시지 통신 패턴 (1~2시간)
   → 이게 제일 낯설고 중요함
4. chrome.storage.local 사용법 (30분)
5. 나머지는 기능 만들면서 그때그때
```
