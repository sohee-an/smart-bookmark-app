# 익스텐션 북마크 일괄 가져오기 — 태스크

> 기획 원문: `docs/extension-browser-import.md`
> 작성일: 2026-04-14

---

## 전체 저장 흐름 (확정)

```
익스텐션: 선택된 URL 전체를 리스트로 한 번에 전송
    ↓
POST /api/extension/bulk-import
    ↓
서버: 기존 URL 조회 (SELECT 1번) → 중복 제거 → bulk INSERT (1번 쿼리)
    ↓
DB: 전체 저장 완료 (ai_status: "pending")
    ↓
크롤링 + AI: 큐에서 순차 처리 (rate limit 안전)
    ↓
크롤링/AI 완료 시 해당 row UPDATE
```

기존 `save-bookmark` (URL 1개짜리)는 팝업에서 현재 탭 저장 용도로 그대로 유지.
일괄 가져오기는 `bulk-import` 엔드포인트를 별도로 사용.

---

## Task 1 — title 버그 수정

**완료 기준:** 바로 가져오기 시 카드에 제목이 즉시 표시됨

- `save-bookmark/route.ts`에서 `{ url, title }` 모두 읽도록 수정
- insert 시 `title` 필드 포함
- 크롤링 전에도 카드에 제목이 보임

---

## Task 2 — 트리 내 중복 URL 제거

**완료 기준:** 같은 URL이 여러 폴더에 있어도 한 번만 전송됨

- `collectSelected()`에서 URL 기준 중복 제거
- 중복 제거 후 선택 카운트에 반영 ("선택한 N개" 숫자가 정확함)

---

## Task 3 — bulk-import 엔드포인트 + DB 중복 스킵

**완료 기준:** URL 리스트를 한 번에 전송하면 중복 제외하고 전부 DB에 저장됨

**API 설계**

```ts
// POST /api/extension/bulk-import
// Request
{
  items: {
    url: string;
    title: string;
  }
  [];
}

// Response
{
  saved: number; // 신규 저장된 수
  skipped: number; // 중복으로 스킵된 수
  failed: number; // 저장 실패한 수
}
```

**서버 처리 순서**

1. Bearer 토큰 인증 (기존 `getUserFromBearer` 재사용)
2. SSRF 방어 (URL 목록 전체 검증)
3. `SELECT url FROM bookmarks WHERE user_id = ? AND url = ANY(?)` — 1번 쿼리로 기존 URL 조회
4. 중복 제거 후 신규 URL만 bulk INSERT
5. ai_status: `"pending"` 으로 저장 (AI는 즉시 실행 안 함)
6. 저장된 bookmark id 목록을 AI 처리 큐에 등록
7. 결과 반환

**ImportView 변경**

- 기존 BATCH_SIZE 배치 전송 → 리스트 한 번에 전송으로 교체
- 완료 메시지: "N개 저장, M개는 이미 저장되어 있어요"

---

## Task 4 — AI 처리 큐 (순차 처리)

**완료 기준:** bulk-import로 저장된 북마크들이 순차적으로 크롤링 + AI 처리됨

- `bulk-import` 저장 완료 후 `waitUntil`로 큐 처리 시작
- 큐: 저장된 bookmark id 목록을 순서대로 하나씩 처리
- 각 항목: 크롤링 → AI 분석 → 임베딩 → DB UPDATE
- 항목 간 딜레이 추가 (Gemini rate limit 대응, 예: 500ms)
- 실패해도 다음 항목으로 계속 진행 (개별 실패가 전체 중단 안 함)
- 처리 완료 시 ai_status: `"completed"`, 실패 시 `"failed"`

---

## Task 5 — AI 정리 API 엔드포인트

**완료 기준:** `POST /api/extension/organize` 호출 시 카테고리 분류 결과가 반환됨

- `apps/web/src/app/api/extension/organize/route.ts` 생성
- Bearer 토큰 인증
- Request: `{ items: { url: string; title: string }[] }`
- Gemini로 카테고리 분류 + 중복 병합 프롬프트 작성
- Response: `{ categories: { name: string; items: { url: string; title: string }[] }[] }`
- CORS 헤더 포함

---

## Task 6 — AI 정리 UI (미리보기 + 수정)

**완료 기준:** "AI로 정리해서 가져오기" 클릭 시 카테고리별 미리보기가 표시되고, 항목 제거 및 카테고리명 수정이 가능함

- 사이드패널 하단에 "AI로 정리해서 가져오기" 버튼 추가
- 화면 상태: `idle → ai-loading → ai-preview → importing → done`
- `ai-loading`: 스피너 + "AI가 분류 중이에요..."
- `ai-preview`:
  - 카테고리별 그룹화된 목록 표시
  - `[×]` 클릭으로 항목 제거
  - 카테고리명 인라인 편집
  - "← 다시 선택" / "이대로 가져오기 →" 버튼
- `components/OrganizePreview.tsx` 신규 생성

---

## Task 7 — AI 정리 결과 저장 + 컬렉션 생성

**완료 기준:** "이대로 가져오기" 클릭 시 북마크가 저장되고, 각 카테고리가 컬렉션으로 자동 생성됨

- 미리보기 확정 후 `bulk-import` 엔드포인트 재사용 (리스트로 전송)
- 카테고리별로 컬렉션 생성 (기존 `POST /api/collections` 재사용)
- 각 북마크를 해당 컬렉션에 추가
- 완료 메시지: "N개 저장, M개 컬렉션 생성"

---

## 의존 관계

```
Task 1 (title 버그)        → 독립
Task 2 (트리 중복)          → 독립
Task 3 (bulk-import API)   → Task 2 완료 후
Task 4 (AI 처리 큐)         → Task 3 완료 후
Task 5 (organize API)      → 독립
Task 6 (AI 정리 UI)         → Task 5 완료 후
Task 7 (컬렉션 생성)        → Task 3, Task 6 완료 후
```

Task 1, 2, 5는 병렬로 진행 가능.
