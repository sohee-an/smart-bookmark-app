# 003 · 인증 우회 — `is_guest` 쿠키

## 심각도

Critical

## 위치

- `apps/web/src/middleware.ts` — 63번째 줄

## 문제

미들웨어가 클라이언트가 임의로 설정할 수 있는 쿠키를 신뢰해 인증 여부를 판단합니다.

```ts
// middleware.ts
const isGuest = request.cookies.get("is_guest")?.value === "true";
const isAuth = !!session || isGuest;
```

브라우저 개발자 도구나 curl로 쿠키를 추가하기만 하면 Supabase 세션 없이 보호된 모든 페이지에 접근 가능합니다.

```bash
# 우회 예시
curl https://example.com/ --cookie "is_guest=true"
```

## 수정 방향

`is_guest` 쿠키를 신뢰하는 대신, 서버가 발급한 서명된 토큰 또는 Supabase anonymous session을 사용합니다.

**옵션 A — Supabase Anonymous Auth 사용**

Supabase의 익명 로그인을 활용하면 비회원도 정식 세션을 가집니다.

```ts
// 게스트 첫 방문 시
const { data } = await supabase.auth.signInAnonymously();
// 이후 session이 존재하므로 is_guest 쿠키 불필요
```

**옵션 B — 쿠키 서명 검증 (임시 방안)**

`is_guest` 쿠키에 HMAC 서명을 붙여 서버에서 검증합니다.
단, 근본 해결은 옵션 A가 더 안전합니다.
