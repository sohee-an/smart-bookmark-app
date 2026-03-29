# Extension 인증 플로우

## 개요

브라우저 익스텐션(Chrome Extension)과 웹앱(Next.js) 간의 Supabase 인증 동기화 방식.
익스텐션과 웹앱은 **독립적인 세션**을 가지며, 익스텐션 로그인은 항상 웹앱을 경유해서 처리된다.

---

## 로그인 플로우

### 1. 로그아웃 상태에서 로그인

```
익스텐션 사이드패널 "로그인하기" 클릭
    ↓
chrome.tabs.create({ url: /login?from=extension })
    ↓
웹앱 /login 페이지 렌더링 (로그인 폼 표시)
    ↓
Google OAuth 버튼 클릭
    ↓
Supabase signInWithOAuth → Google 로그인 완료
    ↓
/auth/callback?from=extension (AuthCallbackClient.tsx)
    ↓
세션 감지 후 /auth/extension-token 으로 이동
    ↓
/auth/extension-token 페이지 (ExtensionTokenPage)
    → useEffect: getSession() → 토큰 추출
    → window.location.href = /auth/extension-token#access_token=...&refresh_token=...
    ↓
background.ts: chrome.tabs.onUpdated 감지
    → refreshSession({ refresh_token }) 호출
    → chrome.storage.local에 세션 저장
    → 탭 닫기 → returnToTab으로 복귀
    ↓
사이드패널: onAuthStateChange 또는 getSession()으로 세션 감지 → 로그인 완료
```

### 2. 웹앱 로그인 상태에서 익스텐션 로그인

```
익스텐션 사이드패널 "로그인하기" 클릭
    ↓
chrome.tabs.create({ url: /login?from=extension })
    ↓
middleware: isAuth=true + from=extension 감지
    → /auth/extension-token 으로 리다이렉트 (해시 없음)
    ↓
background.ts: status=complete, !url.hash → 조기 종료 (아무것도 안 함)
    ↓
/auth/extension-token 페이지 (ExtensionTokenPage)
    → useEffect: getSession() → 기존 웹앱 세션 읽기
    → window.location.href = /auth/extension-token#access_token=...&refresh_token=...
    ↓
background.ts: status=complete, hash 감지
    → refreshSession({ refresh_token }) 호출
    → chrome.storage.local에 세션 저장
    → 탭 닫기 → returnToTab으로 복귀
    ↓
사이드패널: 로그인 완료
```

---

## 핵심 설계 결정

### 익스텐션과 웹앱은 독립 세션

- 익스텐션: `chrome.storage.local`에 세션 저장
- 웹앱: 브라우저 쿠키에 세션 저장
- 익스텐션 로그아웃 → 웹앱 세션 유지 (영향 없음)
- 웹앱 로그아웃 → 익스텐션 세션 유지 (영향 없음)

### Supabase 커스텀 스토리지

익스텐션 환경에서는 `localStorage`가 컨텍스트마다 분리되어 있어 공유가 안 됨.
`chrome.storage.local`을 Supabase 스토리지 어댑터로 사용하면 background, popup, sidepanel이 동일한 세션을 공유할 수 있음.

```ts
// apps/extension/lib/supabase.ts
const chromeStorage = {
  getItem: async (key) => {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  },
  setItem: async (key, value) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key) => {
    await chrome.storage.local.remove(key);
  },
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: chromeStorage,
    detectSessionInUrl: false,
    persistSession: true,
  },
});
```

### 원래 탭 복귀 (returnToTabId)

로그인 전 현재 탭 ID를 저장해두고, 인증 완료 후 해당 탭으로 복귀.

```ts
// 로그인 클릭 시
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.id) chrome.storage.local.set({ returnToTabId: tab.id });
  chrome.tabs.create({ url: `${WEB_URL}/login?from=extension` });
});

// 인증 완료 후 (background.ts)
chrome.tabs.remove(tabId);
chrome.storage.local.get("returnToTabId", ({ returnToTabId }) => {
  if (returnToTabId) {
    chrome.tabs.update(returnToTabId, { active: true });
    chrome.storage.local.remove("returnToTabId");
  }
});
```

---

## 버그 기록

### background.ts 이중 실행 버그

**증상**: 웹앱 로그인 상태에서 익스텐션 로그인 시도 시 실패. 로그아웃 후 다시 하면 성공.

**원인**:
middleware가 `/auth/extension-token#tokens` (해시 포함)으로 리다이렉트 → background.ts 1차 실행 (refreshSession으로 토큰 소비) → 페이지 useEffect도 동일한 토큰으로 자기 리다이렉트 → background.ts 2차 실행 → 이미 소비된 refresh_token으로 refreshSession 실패

**수정**:
middleware에서 해시 없이 `/auth/extension-token`으로만 리다이렉트. 토큰 해시 설정은 페이지 useEffect가 단독으로 담당.

```ts
// middleware.ts - 수정 후
if (fromExtension && session) {
  return NextResponse.redirect(new URL(`/auth/extension-token`, request.url));
}
```

---

## 관련 파일

| 파일                                                    | 역할                                          |
| ------------------------------------------------------- | --------------------------------------------- |
| `apps/extension/entrypoints/background.ts`              | 토큰 URL 감지, refreshSession, 탭 관리        |
| `apps/extension/entrypoints/sidepanel/App.tsx`          | 로그인 상태 표시, 로그인 버튼                 |
| `apps/extension/lib/supabase.ts`                        | chrome.storage.local 기반 Supabase 클라이언트 |
| `apps/web/src/middleware.ts`                            | from=extension 감지 및 리다이렉트             |
| `apps/web/src/app/auth/extension-token/page.tsx`        | 세션에서 토큰 추출 후 해시로 전달             |
| `apps/web/src/app/auth/callback/AuthCallbackClient.tsx` | OAuth 콜백 처리, extension-token으로 라우팅   |
