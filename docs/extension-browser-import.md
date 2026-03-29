# 브라우저 즐겨찾기 일괄 가져오기 (Extension)

## 기능 개요

브라우저에 저장된 기존 즐겨찾기(북마크)를 SmartMark 앱으로 한 번에 가져오는 기능.
크롬 익스텐션 사이드패널에서 폴더/항목을 선택해 일괄 저장하면 AI가 자동으로 분석한다.

---

## 익스텐션 현재 구조

```
apps/extension/
├── entrypoints/
│   ├── background.ts        # 컨텍스트 메뉴, 단축키, Google 로그인 토큰 감지
│   ├── popup/App.tsx        # 현재 탭 저장 + 로그인/로그아웃
│   └── sidepanel/App.tsx    # 미구현 (개발 중)
├── lib/supabase.ts          # chrome.storage.local 기반 Supabase 클라이언트
└── wxt.config.ts            # WXT 설정 (권한, manifest)
```

### 인증 방식

익스텐션은 브라우저 쿠키에 접근할 수 없어서 `chrome.storage.local`에 토큰을 따로 저장한다.

```
Google 로그인 클릭
  → chrome.tabs.create({ url: WEB_URL/login?from=extension })
  → 웹앱에서 로그인 완료 후 /auth/extension-token#access_token=... 으로 리다이렉트
  → background.ts의 tabs.onUpdated가 URL 감지
  → chrome.storage.local에 토큰 저장
  → 탭 자동 닫기
```

### 현재 북마크 저장 흐름

```
팝업 열기
  → 현재 탭 URL 감지 (chrome.tabs.query)
  → "이 페이지 저장" 클릭
  → POST /api/extension/save-bookmark (Authorization: Bearer <token>)
  → 앱 서버에서 AI 분석 파이프라인 실행
```

---

## 브라우저 북마크 API

### chrome.bookmarks API

Chrome/Edge에서 기본 제공하는 API. manifest에 `"bookmarks"` 권한을 추가하면 사용 가능.

```ts
// 전체 트리 가져오기
chrome.bookmarks.getTree((tree) => {
  // tree: BookmarkTreeNode[]
});

// BookmarkTreeNode 구조
interface BookmarkTreeNode {
  id: string;
  title: string;
  url?: string; // url이 없으면 폴더
  children?: BookmarkTreeNode[];
  dateAdded?: number;
}
```

### 폴더 vs 북마크 구분

```ts
const isFolder = (node: BookmarkTreeNode) => !node.url;
const isBookmark = (node: BookmarkTreeNode) => !!node.url;
```

### Chrome 기본 폴더 구조

```
루트 (id: "0")
├── 즐겨찾기 바 (id: "1")      ← 브라우저 상단 바에 표시되는 것
└── 기타 즐겨찾기 (id: "2")    ← 정리 안 된 것들
```

---

## 구현 계획

### 1단계: 권한 추가 (`wxt.config.ts`)

```ts
permissions: ["storage", "tabs", "activeTab", "contextMenus", "sidePanel", "bookmarks"];
```

### 2단계: 사이드패널 UI (`sidepanel/App.tsx`)

사이드패널을 선택한 이유: 팝업은 너무 작아서 폴더 트리 + 체크박스 UI를 표시하기 어렵다.

**UI 구성:**

```
[SmartMark 사이드패널]

브라우저 북마크 가져오기

[전체 선택]
├── [ ] 즐겨찾기 바 (12개)
│   ├── [v] React 문서
│   ├── [v] Next.js 공식 사이트
│   └── [ ] GitHub
└── [ ] 기타 즐겨찾기 (5개)
    ├── [v] MDN Web Docs
    └── [ ] ...

[선택한 3개 가져오기]
```

**상태 관리:**

```ts
type ImportStatus = "idle" | "loading" | "importing" | "done" | "error";

interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
  checked: boolean;
}
```

### 3단계: 가져오기 로직

```ts
const handleImport = async (selectedUrls: string[]) => {
  const session = await supabase.auth.getSession();

  // 순차 처리 (rate limit 고려, 동시에 너무 많이 보내면 서버 부하)
  for (const url of selectedUrls) {
    await fetch(`${WEB_URL}/api/extension/save-bookmark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session?.access_token}`,
      },
      body: JSON.stringify({ url }),
    });
    // 진행률 업데이트
  }
};
```

**진행률 표시:**

```
가져오는 중... 5 / 12
[==========>    ] 42%
```

### 4단계: 폴더 → 컬렉션 매핑 (선택 기능, 나중에)

```
즐겨찾기 바/개발/    →  "개발" 컬렉션 자동 생성 후 북마크 추가
즐겨찾기 바/읽을거리/ →  "읽을거리" 컬렉션 자동 생성 후 북마크 추가
```

현재는 모두 기본 북마크로 저장. 컬렉션 매핑은 나중에 추가.

---

## 수정 파일 목록

| 파일                                           | 변경 내용                                     |
| ---------------------------------------------- | --------------------------------------------- |
| `apps/extension/wxt.config.ts`                 | `"bookmarks"` 권한 추가                       |
| `apps/extension/entrypoints/sidepanel/App.tsx` | 북마크 트리 UI + 일괄 가져오기 로직 전체 구현 |

앱 서버 API(`/api/extension/save-bookmark`)는 기존 것을 그대로 사용. 별도 수정 없음.

---

## 주의사항

- `chrome://` 페이지는 저장 불가 (팝업에서 이미 처리 중인 패턴 참고)
- 즐겨찾기가 수백 개인 경우 순차 처리 + 진행률 표시 필수
- 중복 URL은 서버에서 처리 (API 응답으로 duplicate 여부 확인 가능)
- `chrome.bookmarks` API는 Firefox에서 `browser.bookmarks`로 다름 → WXT가 자동 polyfill 처리
