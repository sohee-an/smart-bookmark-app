# Chrome Extension 전략

> 포폴 + 사업용 동시 대응 설계안 (Turborepo 모노레포 기준)

---

## 핵심 판단: Manifest V3 + WXT 프레임워크

Plasmo, CRXJS도 있지만 **WXT** 추천. 이유:

- Vite 기반 (빠른 빌드, HMR)
- TypeScript first
- Turborepo 모노레포 통합이 가장 깔끔함
- `entrypoints/` 구조로 popup/sidepanel/background/content 자동 인식
- CRXJS는 Vite 플러그인 형태라 모노레포에서 설정이 더 번거로움

---

## 아키텍처 — 모노레포 통합

```
smart-bookmark/
├── apps/
│   ├── web/            # 기존 Next.js
│   └── extension/      # 신규 ← WXT + React
├── packages/
│   ├── types/          # 공유 타입 (Bookmark 등) ← 이미 있음
│   ├── ui/             # 공유 UI ← 이미 있음
│   └── bookmark-core/  # NEW: 핵심 비즈니스 로직 공유
```

### `bookmark-core` 추출 시 주의사항

web의 저장 로직이 Next.js API Route나 Server Component 안에 있으면
단순 복붙으로 분리가 안 됨. 추출 전 확인 필요:

```
✅ 분리 쉬운 경우: 클라이언트에서 Supabase 직접 호출
⚠️  분리 어려운 경우: /api/bookmarks route handler 안에 로직이 있음
    → 순수 함수로 먼저 리팩토링 후 패키지로 이동
```

분리가 어렵다면 Phase 1에서는 무리하지 말고,
extension에서 web API Route를 호출하는 방식으로 임시 대응 후 나중에 정리해도 됨.

---

## Extension 구성 요소

```
apps/extension/
├── entrypoints/
│   ├── popup/          # 아이콘 클릭 → 빠른 저장
│   │   ├── index.html
│   │   └── App.tsx
│   ├── sidepanel/      # Side Panel (핵심 차별점)
│   │   ├── index.html
│   │   └── App.tsx
│   ├── background.ts   # Service Worker
│   └── content.ts      # 페이지 내 주입 (Context Menu용)
├── public/
│   └── icons/
├── wxt.config.ts
└── package.json
```

### Turborepo pipeline 설정

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".output/**", ".wxt/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 기능 우선순위

### Phase 1 — MVP (2주)

| 기능              | 설명                                       | 임팩트        |
| ----------------- | ------------------------------------------ | ------------- |
| Auth 연동         | Supabase session → chrome.storage          | **필수 선행** |
| Popup 저장        | 현재 탭 URL → 1클릭 저장                   | 기본          |
| Context Menu      | 텍스트 선택 → 우클릭 → Save with highlight | 차별점        |
| Keyboard shortcut | `Alt+Shift+B`                              | UX            |

> ⚠️ Auth가 막히면 이후 모든 기능이 막힘. 반드시 첫 번째로 처리.

### Phase 2 — 차별점 (2주)

| 기능                | 설명                                              | 임팩트          |
| ------------------- | ------------------------------------------------- | --------------- |
| **Side Panel**      | 북마크 앱을 페이지 옆에 상시 표시                 | **최고 임팩트** |
| Real-time sync      | Supabase Realtime → 저장 즉시 Side Panel 업데이트 | WOW 포인트      |
| Duplicate detection | 이미 저장된 URL이면 팝업에 경고                   | 실용성          |
| Badge count         | 아이콘에 오늘 저장한 개수 표시                    | 소소한 UX       |

---

## 인증 전략 — Option B: Supabase 직접 연결 (추천)

web과 extension이 동일한 Supabase 프로젝트를 각자 직접 호출.
RLS가 보안을 담당하므로 extension에서 anon key 노출은 허용됨.

```typescript
// packages/bookmark-core/src/auth.ts
import { createClient } from "@supabase/supabase-js";

// chrome.storage adapter — 브라우저 localStorage 대신 사용
const chromeStorage = {
  getItem: (key: string) => chrome.storage.local.get(key).then((res) => res[key] ?? null),
  setItem: (key: string, value: string) => chrome.storage.local.set({ [key]: value }),
  removeItem: (key: string) => chrome.storage.local.remove(key),
};

export const createSupabaseClient = (env: "web" | "extension") => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (env === "extension") {
    return createClient(url, anonKey, {
      auth: {
        storage: chromeStorage,
        detectSessionInUrl: false, // extension에서는 URL 감지 불필요
      },
    });
  }

  return createClient(url, anonKey);
};
```

### 로그인 플로우

웹앱(Next.js)은 extension의 chrome.storage에 직접 쓸 수 없음.
반드시 아래 방식 중 하나로 토큰을 전달해야 함.

**Option 1: URL redirect + background.ts 감지 (추천)**

```
미로그인 상태
  → 팝업에서 "로그인" 버튼 클릭
  → 웹앱 로그인 페이지로 이동 (chrome.tabs.create)
  → 웹앱 로그인 완료
  → Supabase redirect URL을 extension 전용으로 설정
     (예: https://yourapp.com/auth/callback?access_token=xxx)
  → background.ts에서 chrome.tabs.onUpdated로 해당 URL 감지
  → 토큰 파싱 후 chrome.storage.local에 저장
  → 이후 extension은 해당 토큰으로 Supabase 직접 호출
```

```typescript
// background.ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);

  // 로그인 완료 후 redirect된 URL 감지
  if (url.pathname === "/auth/callback") {
    // ⚠️ 취약점 주의: Supabase OAuth 기본 PKCE 흐름은 fragment(#)로 토큰을 전달함
    // url.searchParams는 ?쿼리스트링만 읽으므로 #fragment를 못 잡음
    // 실제 Supabase redirect 방식 확인 후 아래 두 줄 중 맞는 것 사용
    const fragmentParams = new URLSearchParams(url.hash.slice(1));
    const accessToken = fragmentParams.get("access_token") ?? url.searchParams.get("access_token");
    const refreshToken =
      fragmentParams.get("refresh_token") ?? url.searchParams.get("refresh_token");

    if (!accessToken) return;
    chrome.storage.local.set({ accessToken, refreshToken });
    chrome.tabs.remove(tabId); // 로그인 탭 닫기
  }
});
```

**Option 2: chrome.identity API로 OAuth 직접 처리**

```
extension 내부에서 chrome.identity.launchWebAuthFlow 호출
  → Supabase OAuth 엔드포인트로 이동
  → 로그인 완료 후 토큰 바로 반환
  → chrome.storage.local에 저장
```

Supabase 소셜 로그인 설정이 까다롭고 삽질 포인트 많음.
이메일/패스워드 로그인이면 Option 1이 훨씬 단순함.

---

## AI 분석 전략

익스텐션에서 AI 분석까지 처리하면 복잡도가 급격히 올라감.
**저장 → 분석은 분리**하는 게 맞음:

```
[Extension]
URL + 메타데이터 저장 (Supabase 직접)
  ↓
[Web App API Route]  ← extension이 저장 후 별도 호출
AI 분석 트리거 (Gemini API)
  ↓
[Supabase]
분석 결과 업데이트
  ↓
[Side Panel - Realtime]
결과 자동 반영
```

익스텐션 팝업에서는 "저장 중..." → "저장 완료, 분석 중..." 정도만 표시.
상세 분석 결과는 웹앱 or Side Panel에서 확인.

---

## Side Panel — 포폴 핵심 어필 포인트

Chrome 114+에서 추가된 API. 아직 제대로 쓰는 익스텐션이 많지 않음.
Raindrop, Pocket도 미지원 → 차별점.

```
[웹사이트 보면서]      [SmartMark Side Panel]
┌─────────────────┐   ┌──────────────────────┐
│                 │   │  SmartMark           │
│  Medium.com     │   │  ─────────────────── │
│  article...     │   │  방금 저장됨 ✅        │
│                 │   │  Title: ...          │
│                 │   │  Tags: #React #Dev   │
│                 │   │  AI 분석 중...        │
│                 │   │  ─────────────────── │
│                 │   │  🔍 검색...           │
│                 │   │  최근 북마크 목록      │
└─────────────────┘   └──────────────────────┘
```

저장하면 Supabase Realtime으로 Side Panel이 즉시 업데이트됨.

---

## 시작 순서 (수정)

Claude Code 제안 순서에서 Auth를 앞으로 당김:

```
1. WXT 초기화 + Turborepo 연결 확인
2. Auth 연동 (chrome.storage adapter)  ← 최우선
3. Popup 저장 (핵심 기능)
4. bookmark-core 분리 시도
   → web 로직이 API Route에 묶여 있으면 일단 스킵, 나중에 정리
5. Context Menu
6. Side Panel + Realtime 연동
```

---

## 어필 포인트

```
✅ Manifest V3 (최신 표준)
✅ WXT 프레임워크 (Turborepo 모노레포 통합)
✅ packages/bookmark-core 공유 아키텍처
✅ Chrome Side Panel API (Chrome 114+, 레퍼런스도 드문 최신 기능)
✅ Supabase Realtime (저장 → Side Panel 즉시 반영)
✅ Context Menu + text highlight 저장
✅ Service Worker 기반 background 처리
✅ chrome.storage adapter (Supabase auth 커스텀 통합)
✅ RLS 기반 보안 (extension key 노출 무관)
✅ AI 분석 비동기 파이프라인 (저장 → 분석 분리)
```
