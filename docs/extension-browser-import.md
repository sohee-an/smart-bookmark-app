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

---

## 현재 구현 상태 분석 (2026-04-14)

기능 자체는 동작하지만, 아래 이슈들이 미결 상태다.

### 버그

**`title` 무시됨**
extension이 `{ url, title }`을 전송하지만 `route.ts`에서 `url`만 읽는다.
크롤링 완료 전까지 카드에 제목이 없는 상태로 표시됨.

```ts
// ImportView.tsx — title 보냄
body: JSON.stringify({ url, title });

// route.ts — title 무시
const { url } = await request.json(); // title 버려짐
```

---

### 중복 처리 없음

두 가지 중복 케이스가 모두 처리되지 않는다.

**1. 트리 내 중복**
같은 URL이 다른 폴더에 존재할 수 있음. `collectSelected()`에서 중복 제거 없이 그대로 수집됨.

**2. DB 중복 (기존 저장된 북마크)**
`route.ts`에서 URL 존재 여부 체크 없이 바로 insert. 이미 저장된 URL도 중복 저장됨.

**결정 필요:**

- 중복 URL을 스킵할 것인가?
- 기존 데이터를 덮어쓸 것인가?
- 사용자에게 알려줄 것인가?

---

### 대량 import 시 AI/크롤링 폭주

현재 구조: 북마크 1개 저장 → 즉시 크롤링 + AI + 임베딩을 백그라운드 실행.

100개 선택 시:

```
20배치 × 5개 동시 → 100개 Gemini API 호출이 거의 동시 발생
```

- Gemini free tier 분당 15~60 RPM 제한 → rate limit 에러 발생
- Vercel 동시 함수 실행 한도 초과 가능

**해결 방향:**
대량 import는 AI 파이프라인을 즉시 실행하지 않고 큐에 넣어 순차 처리하는 방식이 필요함.
또는 import 시에는 DB 저장만 하고, AI 분석은 별도 배치 작업으로 처리.

---

### 실패 재시도 불가

현재 ImportView는 에러 카운트만 표시함. 어떤 URL이 실패했는지 알 수 없고,
실패한 것만 골라서 재시도하는 방법이 없음.

100개 중 30개 실패 시 → 다시 전체를 선택해서 재시도해야 함.

---

### 미결 결정 사항 요약

| 항목                  | 현재 상태     | 결정 필요                |
| --------------------- | ------------- | ------------------------ |
| 트리 내 중복 URL      | 처리 없음     | 스킵 or 허용             |
| DB 기존 북마크와 중복 | 처리 없음     | 스킵 or 덮어쓰기         |
| 대량 import AI 호출   | 동시 폭주     | 큐 방식 or 지연 처리     |
| title 전달            | 무시됨 (버그) | 수정 필요                |
| 실패한 항목 재시도    | 불가          | 실패 목록 저장 후 재시도 |

---

## 확정된 기획 (2026-04-15)

### 사이드패널 탭 구조

사이드패널을 두 탭으로 분리. 목적이 다르기 때문.

| 탭              | 목적                             | 저장 대상     |
| --------------- | -------------------------------- | ------------- |
| **가져오기**    | 북마크를 SmartMark에 저장        | SmartMark DB  |
| **북마크 정리** | 브라우저 북마크 자체를 편집/정리 | Chrome 북마크 |

---

### 가져오기 탭 (ImportView)

```
트리에서 항목 선택
    ↓
[선택한 N개 바로 가져오기]   [✨ AI로 정리해서 가져오기]
    ↓                               ↓
SmartMark DB에 저장          AI 분류 → OrganizePreview
                                  ↓
                        [📁 브라우저 폴더로 정리] [SmartMark로 가져오기]
                           (독립 동작, 둘 다 가능)
```

---

### 북마크 정리 탭 (BookmarkManager)

브라우저 북마크를 직접 편집하는 공간.

**기능:**

- 전체 북마크 트리 표시
- 중복 감지: URL 완전 일치 기준, `⚠️` 뱃지 표시 + 어느 폴더에 있는지 표시
- 삭제: `chrome.bookmarks.remove()` / `removeTree()`
- 제목 편집: 인라인 편집 → `chrome.bookmarks.update()`
- AI로 정리하기: 전체 북마크 → OrganizePreview (브라우저 저장만, SmartMark 버튼 없음)

**AI 정리 결과 저장 위치:**

```
즐겨찾기 바
└── SmartMark 정리 (YYYY. M. D.)  ← 날짜별 폴더
    ├── 개발
    ├── 디자인
    └── 읽을거리
```

---

### 중복 처리 정책

| 케이스                              | 처리 방식                        |
| ----------------------------------- | -------------------------------- |
| 가져오기 탭 — 트리 내 중복          | URL 기준 첫 번째만 수집 (client) |
| 가져오기 탭 — DB 기존 북마크와 중복 | 서버에서 스킵 (기존 데이터 유지) |
| 정리 탭 — 중복 감지                 | ⚠️ 표시만, 삭제는 유저가 직접    |

---

### OrganizePreview 모드

| prop                           | 동작                                           |
| ------------------------------ | ---------------------------------------------- |
| `hideSmartmark={false}` (기본) | 브라우저 저장 + SmartMark 저장 버튼 둘 다 표시 |
| `hideSmartmark={true}`         | 브라우저 저장 버튼만 표시                      |

---

### 화면 상태 흐름

**가져오기 탭**

```
idle → ai-loading → ai-preview → importing → done
```

**북마크 정리 탭**

```
tree view → (AI 정리 클릭) → OrganizePreview(hideSmartmark) → tree view (새로고침)
```
