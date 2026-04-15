# 크롬 익스텐션 API 아키텍처 — 왜 웹앱 안에 API를 만들었나

## 구조

```
익스텐션 팝업에서 "저장" 클릭
        ↓
apps/extension → fetch POST → https://smartmark.wooyou.co.kr/api/extension/save-bookmark
        ↓
apps/web API Route (서버)
  1. Bearer 토큰으로 유저 확인
  2. Supabase에 북마크 insert
  3. 크롤링 + AI 분석 백그라운드 실행
```

## 왜 익스텐션에서 Supabase에 직접 저장 안 하냐

기술적으로는 가능하지만 두 가지 문제가 있다.

| 문제                 | 이유                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| 크롤링/AI 파이프라인 | 서버에서만 실행 가능 (Node.js 환경 필요)                                 |
| 보안                 | Gemini API Key 같은 시크릿 키를 익스텐션 코드에 넣으면 누구나 볼 수 있음 |

익스텐션은 번들이 공개되기 때문에 코드 안에 시크릿 키를 넣으면 안 된다.

---

## 인증 방식 — Bearer 토큰

웹앱은 쿠키 기반 세션을 쓰는데, 익스텐션은 쿠키를 공유할 수 없다.
그래서 익스텐션은 Supabase `access_token`을 `Authorization: Bearer` 헤더로 전송한다.

```typescript
// 익스텐션 (apps/extension)
const {
  data: { session },
} = await supabase.auth.getSession();

fetch(`${WEB_URL}/api/extension/save-bookmark`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`, // ← 쿠키 대신 Bearer
  },
  body: JSON.stringify({ url: currentUrl }),
});
```

```typescript
// 웹앱 API Route (apps/web)
async function getUserFromBearer(authHeader: string | null) {
  const token = authHeader.slice(7); // "Bearer " 제거

  // 1단계: 토큰 유효성 검증
  const anonClient = createClient(url, anonKey);
  const {
    data: { user },
  } = await anonClient.auth.getUser(token);

  // 2단계: RLS가 유저 JWT 인식하도록 Authorization 헤더 주입
  const supabase = createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  return { user, supabase };
}
```

---

## RLS 500 에러 트러블슈팅

### 에러 상황

익스텐션에서 저장하면 500 "저장 실패" 반환.

### 원인

`createClient(url, anonKey)` 로 만든 클라이언트는 **익명 상태**다.
`auth.getUser(token)` 으로 유저를 확인해도, 그 클라이언트 자체는 여전히 anon key로 요청을 보낸다.
Supabase RLS는 요청의 JWT를 보고 판단하는데, anon key 요청이라 "인증 안 된 유저"로 처리 → insert 차단 → 500.

```
❌ 잘못된 흐름
anonClient.auth.getUser(token) → user 확인 OK
anonClient.from("bookmarks").insert(...) → RLS: "너 anon이잖아" → 차단
```

### 해결

DB 작업용 클라이언트를 별도로 만들 때 `Authorization` 헤더에 유저 JWT를 직접 주입한다.

```typescript
// ✅ 올바른 흐름
const supabase = createClient(url, anonKey, {
  global: {
    headers: { Authorization: `Bearer ${token}` },  // ← JWT 주입
  },
});

supabase.from("bookmarks").insert(...) → RLS: "JWT 확인, 통과" → insert 성공
```

### 핵심 개념

Supabase RLS는 **클라이언트 키가 아니라 요청 헤더의 JWT**를 보고 판단한다.
anon key로 클라이언트를 만들어도, 헤더에 유저 JWT가 있으면 RLS는 그 유저로 인식한다.

---

## 관련 파일

- `apps/web/src/app/api/extension/save-bookmark/route.ts` — 웹앱 API Route
- `apps/extension/entrypoints/popup/App.tsx` — 익스텐션에서 fetch 호출부 (`SaveView` 컴포넌트)
