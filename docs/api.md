# Smart Bookmark — API 레퍼런스

---

## POST /api/crawl

URL을 크롤링해서 메타데이터와 본문을 반환.

**Request**

```json
{ "url": "https://example.com/article" }
```

**Response**

```json
{
  "success": true,
  "data": {
    "title": "페이지 제목",
    "description": "OG 설명",
    "thumbnailUrl": "https://...",
    "bodyChunks": ["본문 청크1", "본문 청크2"]
  }
}
```

**동작**

- Cheerio로 HTML 파싱
- OG 태그 (`og:title`, `og:description`, `og:image`) 우선 추출
- 본문: `p`, `article`, `main` 태그 텍스트 추출
- 실패 시 최대 3회 자동 재시도

---

## POST /api/ai-analyze

크롤링 결과를 받아 AI 요약과 태그를 생성.

**Request**

```json
{
  "title": "페이지 제목",
  "description": "페이지 설명",
  "bodyChunks": ["본문 청크1", "본문 청크2"]
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "title": "AI가 생성한 제목 (원본 없을 때)",
    "summary": "3줄 요약",
    "tags": ["React", "TypeScript", "성능최적화"]
  }
}
```

**동작**

- 모델: `gemini-2.5-flash`
- 제목 없으면 AI가 자동 생성
- 응답은 JSON 형식 강제

---

## POST /api/embed

제목과 요약으로 임베딩 벡터를 생성.

**Request**

```json
{
  "title": "북마크 제목",
  "summary": "AI 요약 내용"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "embedding": [0.123, 0.456, ...]
  }
}
```

**동작**

- 모델: `gemini-embedding-001`
- 벡터 차원: 3072
- 태스크 타입: `RETRIEVAL_DOCUMENT`

---

## POST /api/semantic-search

검색어의 의미를 기반으로 유사한 북마크를 검색.

**Request**

```json
{
  "query": "React 상태관리",
  "userId": "user-uuid",
  "tags": ["React"]
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "exact": [
      {
        "id": "...",
        "url": "...",
        "title": "...",
        "summary": "...",
        "tags": ["React", "Zustand"],
        "similarity": 0.87
      }
    ],
    "related": [...]
  }
}
```

**동작**

1. 검색어를 임베딩으로 변환 (`RETRIEVAL_QUERY` 타입)
2. Supabase RPC `match_bookmarks` 호출
   - `match_threshold: 0.65` — 유사도 65% 미만 제외
   - `match_count: 10` — 최대 10개
   - `p_tags` — 태그 필터 (OR 조건, null이면 전체)
3. 태그 정보 별도 조회 (bookmark_tags JOIN tags)
4. `similarity >= 0.8` → `exact`, `< 0.8` → `related`

---

## GET /api/auth/callback

Supabase OAuth / 이메일 인증 콜백 처리.

**Query Params**

- `code`: Supabase에서 발급한 인증 코드

**동작**

- `exchangeCodeForSession(code)` 호출
- 세션 생성 후 `/`로 리다이렉트
