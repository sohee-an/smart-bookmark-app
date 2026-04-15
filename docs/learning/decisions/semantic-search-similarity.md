# 시맨틱 검색 유사도(Similarity) 가이드

## 개요

시맨틱 검색은 벡터 임베딩의 코사인 유사도(Cosine Similarity)를 기반으로 동작한다.
검색어를 임베딩 벡터로 변환한 뒤, DB에 저장된 북마크 임베딩과의 유사도를 계산해 결과를 반환한다.

---

## 유사도 threshold 구조

현재 코드에는 threshold가 두 단계로 나뉜다.

```
0.0 ──────── 0.65 ───────── 0.8 ────── 1.0
             │               │
          [차단]         [연관 결과]  [정확한 결과]
        match_threshold   EXACT_THRESHOLD
```

### 1. `match_threshold` (DB 레벨 필터)

- **위치**: `apps/web/src/pages/api/semantic-search.ts`
- **현재값**: `0.65`
- **역할**: Supabase RPC `match_bookmarks`에 전달. 이 값 미만은 DB에서 아예 제외됨.
- **효과**: 관련 없는 결과를 DB 조회 단계에서 잘라냄.

```ts
const { data, error } = await supabase.rpc("match_bookmarks", {
  query_embedding: embedding,
  p_user_id: userId,
  match_threshold: 0.65, // ← 여기
  match_count: 10,
});
```

### 2. `EXACT_THRESHOLD` (결과 섹션 분리)

- **위치**: `apps/web/src/pages/api/semantic-search.ts`
- **현재값**: `0.8`
- **역할**: DB에서 가져온 결과를 두 섹션으로 분리.
  - `similarity >= 0.8` → **정확한 결과** (exact)
  - `similarity < 0.8` → **연관된 결과** (related)

```ts
const EXACT_THRESHOLD = 0.8;

exact:   results.filter((r) => r.similarity >= EXACT_THRESHOLD),
related: results.filter((r) => r.similarity < EXACT_THRESHOLD),
```

---

## 현재 값 선택 이유

| threshold         | 값   | 이유                                                                                      |
| ----------------- | ---- | ----------------------------------------------------------------------------------------- |
| `match_threshold` | 0.65 | 0.5는 너무 관대해서 관련 없는 결과가 대거 포함됨. 0.65부터 의미있는 연관성이 생기는 경향. |
| `EXACT_THRESHOLD` | 0.8  | 임베딩 모델 특성상 0.8 이상이면 거의 같은 주제. 0.75~0.85 범위에서 튜닝 권장.             |
| `match_count`     | 10   | 20이면 너무 많음. 한 화면에서 소화할 수 있는 수준으로 제한.                               |

---

## 튜닝 방법

### 결과가 너무 많이 나올 때

```ts
match_threshold: 0.65 → 0.70 또는 0.75
```

### 결과가 너무 안 나올 때 (검색해도 빈 화면)

```ts
match_threshold: 0.65 → 0.55 또는 0.60
```

### "연관된 결과" 섹션을 줄이고 싶을 때

```ts
EXACT_THRESHOLD: 0.8 → 0.75  // 연관 범위를 좁힘
```

### "연관된 결과" 섹션을 없애고 싶을 때

`EXACT_THRESHOLD`를 `match_threshold`와 같게 설정하면 related가 항상 빈 배열이 됨.

---

## 중복 제거 로직

키워드 검색 결과에 이미 포함된 항목은 시맨틱 결과에서 제외된다.

- **위치**: `apps/web/src/pages/bookmarks.tsx`
- **이유**: 같은 북마크가 키워드 섹션과 시맨틱 섹션에 동시에 표시되는 것 방지.

```ts
const keywordFilteredIds = new Set(keywordFiltered.map((b) => b.id));

const deduplicatedExact = semanticExact.filter((r) => !keywordFilteredIds.has(r.id));
const deduplicatedRelated = semanticRelated.filter((r) => !keywordFilteredIds.has(r.id));
```

---

## 사용 모델

- **임베딩 모델**: `gemini-embedding-001`
- **벡터 차원**: `3072`
- **태스크 타입**: `RETRIEVAL_QUERY` (검색어), `RETRIEVAL_DOCUMENT` (저장 시 북마크 본문)

모델이 바뀌면 threshold 기준도 같이 튜닝해야 한다. 모델마다 유사도 분포가 다르기 때문.

---

## 관련 파일

| 파일                                                          | 역할                                    |
| ------------------------------------------------------------- | --------------------------------------- |
| `apps/web/src/pages/api/semantic-search.ts`                   | match_threshold, EXACT_THRESHOLD 설정   |
| `apps/web/src/pages/bookmarks.tsx`                            | 중복 제거, SemanticResultSection 렌더링 |
| `apps/web/src/features/bookmark/ui/SemanticResultSection.tsx` | 정확한/연관 섹션 UI                     |
