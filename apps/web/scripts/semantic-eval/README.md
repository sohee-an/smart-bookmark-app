# 시맨틱 서치 Eval 하네스

시맨틱 검색의 임계값(`exact ≥ 0.8`, `related ≥ 0.65`)을 **감이 아니라 측정으로** 근거화한다.
`app/api/semantic-search/route.ts`가 쓰는 값과 동일한 임베딩 모델(`gemini-embedding-001`, 3072차원)·RPC(`match_bookmarks`)로 채점한다.

## 왜 만들었나

- 지금 임계값 0.8/0.65는 코드에 하드코딩돼 있지만 **근거 데이터가 없다.**
- "정확한 결과 / 연관된 결과" 분리(PROJECT_PLAN §8)가 실제로 유의미한지 증명이 필요하다.
- AI 기능은 "만들었다"가 아니라 **"품질을 측정하고 있다"**가 신뢰의 기준이다.

## 실행

```bash
# 1) golden-set.json 에 evalUserId(테스트 유저 UUID)와 케이스별 relevantUrls 라벨링
# 2) 실행 (읽기 전용, service role로 RLS 우회 채점) — apps/web 안에서
NEXT_PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
GEMINI_API_KEY=... \
pnpm dlx tsx scripts/semantic-eval/run.ts
```

출력: query별 threshold 스윕 표 + 전체 macro precision/recall/F1 표.
precision이 급락하기 직전 지점이 "정확(exact)" 경계 후보다.

## golden set 라벨링 규칙

- `query`: 실제 사용자가 칠 법한 검색어
- `relevantUrls`: 그 query에 "정답"으로 뜨길 기대하는 북마크 URL (테스트 유저 계정에 실제 저장돼 있어야 함)
- 케이스는 20~30개를 목표로 한다. 적으면 곡선이 흔들린다.

## 알려진 한계 (정직하게 기록)

- **벡터 인덱스 없음 → 전체 순차 스캔.** `embeddings.embedding`은 `vector(3072)`인데
  pgvector의 IVFFlat/HNSW 인덱스는 **2000차원 상한**이라 3072차원은 인덱싱 불가.
  `001_initial_schema.sql:43`의 IVFFlat 인덱스도 주석 처리 상태다.
  현재 데이터 규모(개인 북마크 수백 건)에선 순차 스캔으로 충분하지만,
  스케일 시 대응책은 **차원 축소(Matryoshka, 예: 3072→768) 후 인덱싱** 또는 `halfvec`.
  이 Eval은 그 결정(축소가 품질을 얼마나 떨어뜨리는가)을 데이터로 뒷받침하는 토대이기도 하다.
- service role 키를 쓰므로 **로컬/CI 전용**. 프로덕션 런타임에서 호출 금지.
