# Supabase RLS 스키마 드리프트 — "AI 요약 실패"의 전체 체인 추적

> 카드의 "AI 요약 실패" 하나에서 시작해 UI → 파이프라인 → Repository → **DB 정책 실측**까지
> 내려가 두 개의 독립된 원인(정책 회귀 + 스키마 드리프트)을 규명한 기록.

---

## 증상

- 북마크 카드에 "AI 요약 실패" — 그런데 **상세 패널엔 요약·태그가 존재** (모순)
- 새로 저장하는 북마크의 썸네일 누락
- 콘솔: `new row violates row-level security policy (USING expression) for table "tags"`,
  `new row violates row-level security policy for table "embeddings"`

## 추적 과정

1. **프로덕션 API 직접 호출** — `/api/crawl`, `/api/ai-analyze`를 curl로 프로브 → 둘 다 정상.
   외부 API(Gemini)·rate limit 가설 기각. **DB 쓰기가 없는 프로브라 원인 미포착.**
2. **로컬 dev 서버 재현** — 브라우저 콘솔에서 RLS 에러 2종 확보. 여기서 방향 확정:
   _크롤·AI는 성공하고, 결과를 DB에 쓰는 단계가 막히고 있었다._
   (요약은 태그 저장 전에 이미 생성돼 있어 "상세엔 요약, 카드는 실패"라는 모순이 설명됨)
3. **DB를 실측** — 파일이 아니라 라이브 DB에 질의:
   - `pg_policies` → 실제 정책 목록
   - `information_schema.columns` → 실제 컬럼
   - `pg_get_functiondef` → 라이브 `match_bookmarks` 정의

## 원인 1 — tags: 성능 개선이 RLS와 충돌한 회귀

태그 저장을 태그별 순차 왕복(N+1)에서 **배치 upsert**(`onConflict: "name"`)로 개선했는데,
upsert는 기존 행과 충돌하면 **DO UPDATE 경로**를 탄다. `tags`엔 UPDATE 정책이 없어
(001은 select/insert만) "React" 같은 **기존 태그가 하나라도 있으면** 저장 전체가 실패했다.

> 교훈: **RLS 환경에서 upsert는 INSERT 권한만으로 부족하다.** 충돌 시 UPDATE
> 정책(USING/WITH CHECK)까지 평가된다. 성능 리팩터링이 보안 정책과 충돌할 수 있다.

**수정** — 정책을 넓히는 대신 코드를 정책에 맞춤:

- `ignoreDuplicates: true`(DO NOTHING)로 전환 → UPDATE 권한 자체가 불필요 (최소 권한 유지)
- DO NOTHING은 기존 행을 반환하지 않으므로 이름으로 id 일괄 재조회 (여전히 배치 3쿼리)

## 원인 2 — embeddings: 마이그레이션 파일과 실제 DB의 드리프트

`pg_policies` 실측 결과, 실제 DB에는:

- 초기 세팅 때의 **구식 정책** `"Users access own embeddings"` (ALL, `auth.uid() = user_id`)
- **legacy `user_id` 컬럼**

이 남아 있었고, 리포지토리의 001 마이그레이션(`embeddings_insert` 등 EXISTS 기반 정책)은
**적용된 적이 없었다.** 앱은 001 스키마 기준이라 `user_id`를 보내지 않음 →
`auth.uid() = NULL` → **모든 임베딩 INSERT가 조용히 실패** (fire-and-forget + catch라
화면엔 티가 안 남 → 신규 북마크가 시맨틱 검색에서 누락되는 형태로만 드러남).

**판정 근거**: 라이브 `match_bookmarks`는 `bookmarks` 조인(`b.user_id = p_user_id`)으로
소유권을 판정하고 `embeddings.user_id`를 사용하지 않음 → legacy 컬럼은 안전하게 제거 가능.

**수정** (migration 007):

- 구식 ALL 정책·legacy 컬럼 제거, 001 설계(북마크 소유권 EXISTS)로 통일
- `saveEmbedding`의 `onConflict: "bookmark_id"` 명시 (기본값 PK는 재저장 충돌 해소 불가)
- 갱신 경로용 소유자 한정 UPDATE 정책 (migration 006)

## 부수 발견 — 파이프라인 정체성 불일치

저장 파이프라인이 **단계마다** `getSession()`으로 저장소를 재선택해서, 세션 만료→자동갱신
타이밍에 걸리면 저장은 게스트(localStorage), 임베딩은 회원(Supabase)으로 갈라질 수 있었다.
Supabase에 없는 북마크 id로 임베딩 insert → RLS 위반.

**수정**: `saveEmbedding`에 소유 확인 가드(해당 북마크가 Supabase에 존재할 때만 저장).
근본적으로는 "**하나의 작업 흐름 안에서 정체성은 한 번만 결정**"이 원칙 — 저장소를
파이프라인 시작 시 고정하는 리팩터링을 후속 과제로 남긴다.

## 부수 발견 2 — 썸네일이 회원 DB에 저장된 적이 없었다

같은 추적에서 "썸네일이 새로고침하면 사라진다"의 원인도 드러났다.
`UpdateBookmarkData` 타입에 `thumbnailUrl`이 누락돼 있었고, Supabase repository의
update 매핑에도 `thumbnail_url`이 없었다. 파이프라인은 `{ thumbnailUrl, ... }`을
보내지만 **변수로 전달돼 TS 초과 속성 검사를 우회** → 컴파일은 통과, repo는 조용히 무시.

- 화면에선 React Query 캐시(patchCache)가 썸네일을 보여줘 **새로고침 전까진 정상처럼 보임**
- 게스트(localStorage)는 `{ ...row, ...data }` 스프레드라 저장됨, 익스텐션 파이프라인은
  서버에서 직접 매핑이라 저장됨 → **회원 + 웹 저장 조합에서만** 소실

**수정**: `UpdateBookmarkData`에 `thumbnailUrl` 추가 + Supabase update 매핑 추가.

> 이 프로젝트의 버그 추적 규칙("업데이트 타입의 필드 누락을 가장 먼저 확인",
> "새로고침 후 유지되는가를 기준으로") 그대로의 사례.

## 교훈

1. **마이그레이션 파일 ≠ 실제 DB.** 파일은 의도의 기록일 뿐, 드리프트는 실측
   (`pg_policies`, `information_schema`, `pg_get_functiondef`)으로만 확인된다.
2. **RLS에서 upsert는 UPDATE 정책까지 필요하다.** DO NOTHING으로 회피하면 권한을
   넓히지 않고 해결할 수 있다.
3. **fire-and-forget 실패는 원인을 남겨야 한다.** 조용한 실패는 "시맨틱 검색이 왜
   안 되지?"라는 먼 증상으로만 드러난다 — 실패 사유 저장(관측가능성)이 후속 과제.
4. **전체 체인 추적**: UI 증상 → 서비스 → Repository → DB 쿼리 → **DB 정책**까지.
   API 프로브만으론 "DB 쓰기 단계" 원인을 놓친다.
5. **"새로고침 후에도 유지되는가"가 저장의 기준.** 캐시(낙관적 업데이트)가 화면을
   속일 수 있다 — update 타입의 필드 누락은 TS도 (변수 전달 시) 못 잡는다.
