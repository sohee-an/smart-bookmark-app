# 인증(Auth) 핵심 개념 정리

> smart-bookmark 프로젝트에서 Supabase + Next.js 미들웨어 기반 인증을 구현하면서 직접 부딪히고 정리한 개념들

---

## 1. 브라우저 저장소

브라우저에서 데이터를 저장할 수 있는 세 가지 공간.

|           | localStorage | sessionStorage | 쿠키                  |
| --------- | ------------ | -------------- | --------------------- |
| 서버 접근 | ❌           | ❌             | ✅                    |
| 만료      | 영구         | 탭 닫으면 삭제 | 설정 가능             |
| 용량      | ~5MB         | ~5MB           | ~4KB                  |
| XSS 취약  | ✅ 취약      | ✅ 취약        | HttpOnly 설정 시 안전 |

### 왜 Next.js + SSR 환경에서는 쿠키를 써야 하나

서버(미들웨어)는 요청(Request)만 볼 수 있다. 요청에는 쿠키가 포함되지만, localStorage는 브라우저에만 존재하기 때문에 서버에서 절대 읽을 수 없다.

```
미들웨어 (서버에서 실행)
  ↓
req.cookies 읽기 → 세션 확인 → 통과/차단 ✅

localStorage → 서버에서 접근 불가 ❌
```

### HttpOnly 쿠키가 왜 안전한가

```javascript
// HttpOnly 옵션이 있으면
// 브라우저의 JS에서 document.cookie로 읽을 수 없음
// → XSS 공격으로 쿠키를 훔쳐갈 수 없음

Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```

---

## 2. JWT (JSON Web Token)

Supabase를 포함한 대부분의 인증 서비스가 세션 정보를 JWT 형식으로 만든다.

### 구조

```
eyJhbGci...  .  eyJ1c2VySWQi...  .  SflKxwRJSMeKKF...
   header    .      payload       .      signature
```

세 부분이 `.` 으로 구분되고 Base64로 인코딩되어 있다.

### payload 예시

```json
{
  "sub": "user-uuid-1234",
  "email": "user@example.com",
  "role": "authenticated",
  "exp": 1719999999,
  "iat": 1719996399
}
```

- `sub` — 유저 ID
- `exp` — 만료 시간 (Unix timestamp)
- `iat` — 발급 시간

### 핵심 특징

JWT는 **서명(signature)** 이 있기 때문에 서버가 DB 조회 없이 토큰의 유효성을 검증할 수 있다. 단, 토큰 자체를 탈취당하면 만료 전까지 막을 방법이 없어서 만료 시간을 짧게 설정하고 Refresh Token과 함께 사용한다.

> 직접 확인하기: [jwt.io](https://jwt.io) 에서 Supabase 토큰을 붙여넣으면 payload를 디코딩해서 볼 수 있다.

---

## 3. 인증 vs 인가

자주 혼용되지만 다른 개념이다.

```
인증 (Authentication) → "니가 누구냐"  → 로그인 여부 확인
인가 (Authorization)  → "니가 이걸 할 수 있냐" → 권한 확인
```

### 예시

```typescript
// 미들웨어에서 인증 체크
if (!session) {
  return redirect("/landing"); // 인증 안 됨 → 로그인 페이지로
}

// API Route에서 인가 체크
if (bookmark.userId !== session.user.id) {
  return res.status(403).json({ error: "Forbidden" }); // 권한 없음
}
```

---

## 4. OAuth Authorization Code Flow

이메일 인증, 구글/카카오 소셜 로그인 모두 같은 패턴을 따른다. smart-bookmark에서 `/api/auth/callback` 라우트가 필요했던 이유가 바로 이 흐름 때문이다.

### 흐름

```
1. 사용자가 이메일 인증 링크 클릭
        ↓
2. Supabase가 code를 URL에 담아 callback으로 리다이렉트
   http://localhost:3000/api/auth/callback?code=abcd1234
        ↓
3. callback 라우트에서 code를 받아 Supabase에 전달
        ↓
4. Supabase가 code를 실제 세션 토큰(JWT)으로 교환
        ↓
5. JWT를 쿠키에 저장
        ↓
6. 메인 페이지로 리다이렉트 → 미들웨어 통과 ✅
```

### callback 라우트가 없으면

```
이메일 인증 링크 클릭
        ↓
URL에 code가 있지만 처리하는 곳이 없음
        ↓
세션 쿠키가 생성되지 않음
        ↓
미들웨어: "세션 없음" → /landing 으로 튕김 ❌
```

### 구현 코드

```typescript
// pages/api/auth/callback.ts
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (code) {
    const supabase = createPagesServerClient({ req, res });
    // code → JWT 교환 + 쿠키 저장까지 한 번에 처리
    await supabase.auth.exchangeCodeForSession(String(code));
  }

  res.redirect("/");
}
```

---

## 5. 쿠키 보안 옵션

쿠키를 그냥 쓰면 보안에 취약하다. 옵션을 제대로 설정해야 한다.

```
HttpOnly  → JS에서 document.cookie로 읽기 불가 → XSS 방어
Secure    → HTTPS 연결에서만 쿠키 전송
SameSite  → 다른 사이트에서의 요청에 쿠키 포함 여부 → CSRF 방어
  - Strict : 같은 사이트 요청에만 전송
  - Lax    : 일부 외부 요청 허용 (일반적으로 권장)
  - None   : 모든 요청에 전송 (Secure 필수)
Path      → 특정 경로에서만 쿠키 전송
```

### 면접 포인트

> "쿠키 보안은 어떻게 처리했나요?"

`@supabase/ssr` 라이브러리가 내부적으로 HttpOnly + Secure + SameSite=Lax 옵션으로 쿠키를 설정해준다. 직접 구현할 경우에는 위 옵션들을 명시적으로 설정해야 한다.

---

## 전체 흐름 요약

```
로그인/이메일 인증
        ↓
Supabase → code 발급 → callback URL로 리다이렉트
        ↓
/api/auth/callback
        ↓
code → JWT 교환 (exchangeCodeForSession)
        ↓
JWT → HttpOnly 쿠키에 저장
        ↓
미들웨어: req.cookies에서 JWT 읽기 → 검증 → 통과/차단
        ↓
페이지 접근
```

---

---

---

# 중급 (Mid-level) 개념 정리

> 주니어 개념을 완전히 이해한 후 읽을 것. 실무에서 인증 시스템을 직접 설계하거나 보안 이슈를 사전에 방지하려면 반드시 알아야 한다.

---

## 6. Access Token + Refresh Token 전략

JWT를 하나만 쓰면 문제가 있다. 만료를 길게 잡으면 탈취 시 위험하고, 짧게 잡으면 사용자가 자주 로그아웃된다. 이를 해결하기 위해 두 종류의 토큰을 함께 쓴다.

```
Access Token  → 수명 짧음 (15분 ~ 1시간), API 요청에 사용
Refresh Token → 수명 김 (7일 ~ 30일), Access Token 재발급에만 사용
```

### 흐름

```
로그인
  ↓
Access Token (15분) + Refresh Token (7일) 발급
  ↓
API 요청 시 Access Token 사용
  ↓
Access Token 만료
  ↓
Refresh Token으로 새 Access Token 재발급 (자동)
  ↓
Refresh Token도 만료 → 재로그인 요청
```

### Refresh Token 로테이션

보안을 강화하기 위해 Refresh Token을 사용할 때마다 새 Refresh Token을 발급하고 기존 것을 무효화하는 전략이다.

```
Refresh Token 사용
  ↓
새 Access Token + 새 Refresh Token 발급
  ↓
기존 Refresh Token 무효화 (DB에서 삭제)
```

탈취된 Refresh Token이 사용되면 기존 사용자의 토큰도 함께 무효화되기 때문에 탈취 사실을 감지할 수 있다.

> Supabase는 기본적으로 Refresh Token 로테이션을 지원한다.

---

## 7. 토큰 강제 만료 (Revocation)

JWT의 치명적인 단점은 **한 번 발급하면 만료 전까지 서버가 막을 방법이 없다**는 것이다. 로그아웃해도 토큰이 탈취되어 있으면 만료 전까지 유효하다.

### 해결 방법

**① 토큰 블랙리스트 (Denylist)**

```
무효화할 토큰 ID(jti)를 DB나 Redis에 저장
  ↓
API 요청마다 블랙리스트 조회
  ↓
블랙리스트에 있으면 거부
```

단점: 요청마다 DB 조회 발생 → 성능 저하

**② Access Token 수명을 극단적으로 짧게 (5분)**

탈취되어도 피해 범위가 작다. Refresh Token 로테이션과 함께 쓰면 실질적으로 안전하다.

**③ 세션 버전 관리**

```typescript
// DB에 session_version 컬럼 추가
// 로그아웃 시 session_version 증가
// JWT payload의 version과 DB version 비교
if (token.version !== user.sessionVersion) {
  throw new Error("Token invalidated");
}
```

---

## 8. CSRF 공격과 방어

### CSRF란

Cross-Site Request Forgery. 사용자가 인증된 상태에서 악성 사이트가 사용자 몰래 요청을 보내는 공격이다.

```
시나리오:
1. 사용자가 bank.com에 로그인 (쿠키에 세션 있음)
2. 악성 사이트 evil.com 방문
3. evil.com이 bank.com으로 송금 요청 자동 전송
4. 브라우저가 쿠키를 자동으로 포함해서 전송 → 공격 성공
```

### SameSite 쿠키로 방어

```
SameSite=Strict → 외부 사이트에서의 요청에 쿠키 절대 포함 안 함
SameSite=Lax    → GET 요청은 허용, POST/PUT/DELETE는 차단 (일반적으로 권장)
SameSite=None   → 모든 요청 허용 (Secure 필수, 서드파티 쿠키에 사용)
```

### CSRF Token으로 방어

```
서버가 폼에 랜덤 토큰 삽입
  ↓
요청 시 토큰 함께 전송
  ↓
서버에서 토큰 검증
  ↓
악성 사이트는 이 토큰을 모르기 때문에 공격 불가
```

---

## 9. XSS 공격과 방어

### XSS란

Cross-Site Scripting. 공격자가 악성 스크립트를 페이지에 심어 실행시키는 공격이다.

```
시나리오:
1. 공격자가 댓글에 <script>document.cookie</script> 삽입
2. 피해자가 해당 페이지 방문
3. 스크립트 실행 → 쿠키/토큰 탈취
```

### 방어 방법

**① HttpOnly 쿠키**

```
document.cookie로 읽기 불가 → 스크립트로 탈취 불가
```

**② CSP (Content Security Policy)**

```
// HTTP 헤더로 허용할 스크립트 출처를 제한
Content-Security-Policy: script-src 'self' https://trusted.com
```

외부에서 주입된 스크립트가 실행되지 않는다.

**③ 입력값 이스케이프**

```typescript
// 사용자 입력값을 그대로 HTML에 렌더링하면 안 됨
// React는 기본적으로 자동 이스케이프 처리함
// dangerouslySetInnerHTML 사용 시 주의
```

---

## 10. Stateful 세션 vs Stateless JWT 트레이드오프

### Stateful 세션 (전통적인 방식)

```
로그인 → 서버 DB에 세션 저장 → 세션 ID를 쿠키로 전달
요청마다 → 세션 ID로 DB 조회 → 유저 확인
```

장점: 즉시 강제 만료 가능, 세션 목록 관리 가능
단점: 요청마다 DB 조회, 서버 수평 확장 시 세션 공유 문제

### Stateless JWT

```
로그인 → JWT 발급 → 클라이언트에 저장
요청마다 → JWT 서명 검증 (DB 조회 없음)
```

장점: DB 조회 없음, 서버 수평 확장 용이
단점: 토큰 강제 만료 어려움, 토큰 크기가 세션 ID보다 큼

### 실무에서의 선택

```
트래픽이 많고 서버를 수평 확장해야 한다 → JWT
보안이 최우선이고 즉시 만료가 필요하다  → Stateful 세션
둘 다 필요하다                          → JWT + Redis 블랙리스트
```

---

## 11. IDOR (Insecure Direct Object Reference)

인가(Authorization) 취약점 중 가장 흔한 유형이다. 인증은 됐지만 다른 사용자의 리소스에 접근할 수 있는 경우다.

```
시나리오:
GET /api/bookmarks/123  → 내 북마크
GET /api/bookmarks/124  → 다른 사람 북마크도 조회됨 ❌
```

### 방어 방법

```typescript
// API Route에서 반드시 소유자 확인
const bookmark = await getBookmark(id);

if (bookmark.userId !== session.user.id) {
  return res.status(403).json({ error: "Forbidden" });
}
```

단순히 로그인 여부만 확인하고 소유자 확인을 빠뜨리는 실수가 많다.

---

## 12. 멀티 디바이스 로그인 처리

실제 서비스에서는 같은 계정으로 여러 기기에서 동시 로그인이 가능해야 한다.

### 세션 테이블 관리

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  refresh_token TEXT,
  device_info TEXT,  -- "iPhone 15", "Chrome on Windows"
  created_at TIMESTAMP,
  last_used_at TIMESTAMP
);
```

### 기능 구현

```
특정 기기 로그아웃 → 해당 세션만 삭제
모든 기기 로그아웃 → user_id 기준으로 모든 세션 삭제
세션 목록 조회     → "현재 로그인된 기기" 화면 구현 가능
```

실제 프로세스
실제 흐름  
 [server.ts] - API Route (서버)  
 exchangeCodeForSession()
↓
Set-Cookie 헤더를 HTTP 응답에 담아서 브라우저에 전달
↓
브라우저가 쿠키 자동 저장

[client.ts] - React 컴포넌트 (브라우저)
supabase.auth.getUser()
↓
브라우저에 이미 저장된 쿠키를 직접 읽음
(document.cookie 또는 내부적으로 쿠키 접근)

핵심 차이

┌───────────┬─────────────────────────────┬────────────────┐
│ │ server.ts │ client.ts │
├───────────┼─────────────────────────────┼────────────────┤
│ 실행 위치 │ Node.js (서버) │ 브라우저 │
├───────────┼─────────────────────────────┼────────────────┤
│ 쿠키 읽기 │ req.cookies │ 브라우저 자체 │
├───────────┼─────────────────────────────┼────────────────┤
│ 쿠키 쓰기 │ res.setHeader("Set-Cookie") │ 브라우저 자체 │
├───────────┼─────────────────────────────┼────────────────┤
│ 사용처 │ API Route, middleware │ React 컴포넌트 │
└───────────┴─────────────────────────────┴────────────────┘

즉 server.ts가 Set-Cookie를 응답 헤더에 실어 보내면, 브라우저가 알아서 저장하고, 이후  
 client.ts는 브라우저에 저장된 쿠키를 직접 읽는 구조입니다. 둘 사이에 직접 통신은 없어요.

---

## 중급 개념 요약

| 개념                   | 핵심 포인트                             |
| ---------------------- | --------------------------------------- |
| Access + Refresh Token | 수명 분리로 보안과 UX 동시 확보         |
| Refresh Token 로테이션 | 사용할 때마다 교체 → 탈취 감지 가능     |
| 토큰 강제 만료         | JWT 단점 극복 → 블랙리스트 or 짧은 수명 |
| CSRF                   | SameSite 쿠키로 방어                    |
| XSS                    | HttpOnly + CSP로 방어                   |
| Stateful vs Stateless  | 트레이드오프 이해하고 상황에 맞게 선택  |
| IDOR                   | 인증 됐어도 소유자 확인 필수            |
| 멀티 디바이스          | 세션 테이블로 기기별 관리               |

---

## 추가 학습 자료

### 공식 문서

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Supabase SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js 미들웨어 공식 문서](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### JWT

- [jwt.io](https://jwt.io) — JWT 직접 디코딩해볼 수 있음
- [JWT 공식 스펙 (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)

### OAuth

- [OAuth 2.0 쉽게 이해하기 (생활코딩)](https://opentutorials.org/course/3405)
- [OAuth 2.0 Authorization Code Flow 공식 설명](https://oauth.net/2/grant-types/authorization-code/)

### 웹 보안

- [OWASP XSS 설명](https://owasp.org/www-community/attacks/xss/)
- [OWASP CSRF 설명](https://owasp.org/www-community/attacks/csrf)
- [MDN 쿠키 문서](https://developer.mozilla.org/ko/docs/Web/HTTP/Cookies)

---

## 13. localStorage 방식의 깜빡임(Flash) 문제

### 왜 깜빡이나

localStorage는 JS가 실행된 후에야 읽을 수 있다. 서버는 요청 시점에 인증 여부를 모른다.

```
localStorage 방식
  ↓
서버: "인증 여부 모름" → 일단 HTML 내려줌
  ↓
브라우저: 로그인 안 된 화면 렌더링 (순간적으로 보임)
  ↓
JS 실행 → localStorage 읽음 → "로그인 돼있네"
  ↓
화면 업데이트 → 깜빡임 발생 ❌
```

```
쿠키 + 미들웨어 방식
  ↓
브라우저 요청 → 쿠키 자동 포함
  ↓
미들웨어: 쿠키 읽음 → 인증 확인 완료
  ↓
서버: 로그인 된 상태의 HTML 바로 내려줌
  ↓
깜빡임 없음 ✅
```

### 실제로 어떻게 보이냐

```
localStorage 방식:
  [로그아웃 상태 UI] → (100ms) → [로그인 상태 UI]  ← 사용자가 봄

쿠키 방식:
  [로그인 상태 UI]  ← 처음부터 올바른 화면
```

---

## 14. React SPA에서 쿠키 저장 가능한가

가능하다. 단 **HttpOnly 쿠키는 불가능**하다는 제약이 있다.

### 클라이언트에서 쿠키 설정

```typescript
import Cookies from "js-cookie"; // js-cookie 라이브러리

Cookies.set("token", jwt, {
  expires: 7, // 7일
  secure: true, // HTTPS에서만 전송
  sameSite: "Lax", // CSRF 방어
  // HttpOnly: true ← 클라이언트 JS에서 설정 불가 ❌
});
```

### 핵심 제약

```
HttpOnly 쿠키는 서버만 설정할 수 있다.
  ↓
클라이언트 JS로 설정한 쿠키는 HttpOnly 불가
  ↓
document.cookie로 읽기 가능
  ↓
XSS 취약점은 localStorage와 동일
```

### 저장 방식별 보안 비교

|                | localStorage | 클라이언트 쿠키 | HttpOnly 쿠키 |
| -------------- | ------------ | --------------- | ------------- |
| XSS 방어       | ❌           | ❌              | ✅            |
| 서버 설정 필요 | ❌           | ❌              | ✅            |
| 미들웨어 사용  | ❌           | △               | ✅            |
| 깜빡임 없음    | ❌           | △               | ✅            |

### 결론

**HttpOnly 쿠키는 서버가 있어야 제대로 쓸 수 있다.**

순수 React SPA에서 진짜 보안을 원하면 백엔드 서버가 쿠키를 설정해줘야 한다. Next.js는 서버가 내장돼 있어서 자연스럽게 가능하다.

```
순수 React SPA
  → 백엔드 서버가 Set-Cookie 헤더로 HttpOnly 쿠키 설정
  → 이후 요청마다 쿠키 자동 포함

Next.js
  → API Route 또는 미들웨어에서 직접 쿠키 설정 가능
  → 별도 백엔드 없이도 HttpOnly 쿠키 사용 가능
```

---

## 중급 추가 학습 자료

### Refresh Token

- [Refresh Token Rotation 공식 설명 (Auth0)](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [Supabase Refresh Token 문서](https://supabase.com/docs/guides/auth/sessions)

### 웹 보안 심화

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — 웹 보안 취약점 상위 10개
- [OWASP IDOR 설명](https://owasp.org/www-chapter-ghana/assets/slides/IDOR.pdf)
- [CSP(Content Security Policy) MDN 문서](https://developer.mozilla.org/ko/docs/Web/HTTP/CSP)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) — XSS, CSRF, IDOR 실습 가능

### JWT 심화

- [JWT 보안 취약점 정리 (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Should you use JWT? (영상)](https://www.youtube.com/watch?v=GdJ0wFi1Jyo)

### 세션 설계

- [Redis로 세션 관리하기](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Stateful vs Stateless Authentication](https://stackoverflow.com/questions/22826371/stateless-vs-stateful-authentication)
