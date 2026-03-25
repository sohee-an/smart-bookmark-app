# A01 - Broken Access Control

## 개요

OWASP Top 10 2021 기준 1위. 인증(Authentication)은 "누구인지 확인"이고, 인가(Authorization)는 "무엇을 할 수 있는지 제어"다. Broken Access Control은 이 인가 로직이 깨진 상태를 말한다.

사용자가 자신에게 허용되지 않은 기능이나 데이터에 접근할 수 있을 때 발생한다. 공격자 입장에서는 별다른 기술 없이 URL 변조, 파라미터 조작만으로 타인의 데이터를 열람·수정·삭제할 수 있어 파급력이 매우 크다.

### 대표 공격 유형

| 유형                                    | 설명                                                              | 예시                                         |
| --------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| IDOR (Insecure Direct Object Reference) | 직접 객체 참조 취약점. 다른 사용자의 리소스 ID를 그대로 넣어 접근 | `GET /bookmarks/abc123` → 타인 북마크 조회   |
| 인증 없는 API                           | 로그인하지 않아도 호출 가능한 내부 API                            | `/api/ai-analyze` 누구나 호출 → AI 쿼터 소진 |
| 미작동 미들웨어                         | 인증 체크 코드가 실행되지 않는 상태                               | 파일명 오류로 Next.js 미들웨어 비활성화      |
| Privilege Escalation                    | 권한이 낮은 사용자가 높은 권한 기능 실행                          | 게스트가 회원 전용 API 호출                  |

---

## 이 프로젝트에서 발견 및 수정한 취약점

### 취약점 1 — IDOR: `/api/semantic-search`에서 userId를 클라이언트 body로 수신

**심각도**: Critical

**취약한 코드 (수정 전)**

```ts
// apps/web/src/app/api/semantic-search/route.ts
export async function POST(request: Request) {
  const { query, userId, tags } = await request.json(); // ← 클라이언트가 userId를 직접 전달

  const { data } = await supabase.rpc("match_bookmarks", {
    p_user_id: userId, // ← 검증 없이 그대로 사용
    ...
  });
}
```

**공격 시나리오**

```
공격자가 타겟 사용자의 userId를 알고 있다면:
POST /api/semantic-search
{ "query": "비밀", "userId": "victim-user-id-1234" }

→ 피해자의 북마크 전체가 검색 결과로 반환됨
```

Supabase의 user ID는 UUID 형식이지만, 공개된 API 응답이나 다른 경로로 노출될 수 있다.

**수정 방법**

클라이언트가 전달한 `userId`를 신뢰하는 대신, 서버에서 세션을 직접 조회해 사용자를 식별한다.

```ts
// 수정 후
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser(); // ← 서버 세션에서 추출

  if (!user) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { query, tags } = await request.json(); // userId 제거

  const { data } = await supabase.rpc("match_bookmarks", {
    p_user_id: user.id, // ← 서버가 검증한 ID 사용
    ...
  });
}
```

클라이언트(`BookmarksContent.tsx`)에서도 `userId` 전달 제거:

```ts
// 수정 전
body: JSON.stringify({ query, userId: user.id, tags: selectedTags });

// 수정 후
body: JSON.stringify({ query, tags: selectedTags });
```

**핵심 원칙**: 인가 판단에 필요한 사용자 식별 정보는 **항상 서버 세션에서 추출**해야 한다. 클라이언트가 전달한 ID는 신뢰할 수 없다.

---

### 취약점 2 — 인증 없는 내부 API: `/api/ai-analyze`, `/api/embed`, `/api/crawl`

**심각도**: High

**취약한 상태 (수정 전)**

세 API 모두 인증 체크 없이 누구나 호출 가능했다.

```ts
// apps/web/src/app/api/ai-analyze/route.ts (수정 전)
export async function POST(request: Request) {
  const { title, description, bodyChunks } = await request.json();
  // 바로 Gemini API 호출 — 인증 체크 없음
  const result = await model.generateContent(prompt);
  ...
}
```

**공격 시나리오**

```
외부 공격자가 반복 호출:
for i in range(10000):
    POST /api/ai-analyze  { "title": "...", "bodyChunks": [...] }

→ Gemini API 쿼터 소진 → 서비스 장애
→ API 비용 폭증
```

**수정 방법**

로그인 사용자 또는 유효한 게스트 세션이 있는 경우만 허용한다. 게스트도 북마크를 저장할 수 있으므로 파이프라인 API(`crawl`, `ai-analyze`, `embed`)는 게스트를 포함한다.

```ts
// 수정 후 — 세 API 공통 패턴
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const isGuest = cookieStore.get("is_guest")?.value === "true";

  if (!user && !isGuest) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  // 이후 비즈니스 로직 실행
  ...
}
```

**게스트 허용 이유**: 비회원도 북마크 저장(5개 제한)이 가능하고, 저장 후 크롤링→AI 분석→임베딩 파이프라인이 즉시 실행된다. `is_guest=true` 쿠키는 서버에서 설정하는 값이므로 클라이언트가 임의로 위조해도 localStorage 기반 5개 제한에 걸린다.

**`/api/semantic-search`는 게스트 비허용**: 시맨틱 검색은 임베딩 벡터가 Supabase에 저장된 로그인 사용자만 사용 가능하므로 게스트를 허용하지 않는다.

---

## 자바 백엔드 전환 시 고려사항

현재 수정은 Next.js API Route 레벨에서 임시 방어한 것이다. Spring Boot 백엔드로 전환하면:

- **userId 신뢰 문제** → Spring Security + JWT 필터에서 토큰 검증 후 `SecurityContext`에서 추출. 컨트롤러는 `@AuthenticationPrincipal`로 받음
- **인증 없는 API** → Spring Security의 `SecurityFilterChain`에서 `/api/**` 전체에 인증 요구
- **게스트 처리** → JWT 토큰에 `role: guest` 클레임 포함, 게스트 전용 권한 분리

```java
// Spring Security 예시
@PostMapping("/api/semantic-search")
public ResponseEntity<?> semanticSearch(
    @AuthenticationPrincipal UserDetails user,  // ← 클라이언트가 조작 불가
    @RequestBody SearchRequest req
) {
    return service.search(user.getId(), req.getQuery());
}
```

---

## 참고

- [OWASP A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- 관련 파일: `apps/web/src/app/api/semantic-search/route.ts`, `apps/web/src/app/api/ai-analyze/route.ts`, `apps/web/src/app/api/embed/route.ts`, `apps/web/src/app/api/crawl/route.ts`
