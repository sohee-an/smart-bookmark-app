-- ============================================================
-- match_bookmarks: 벡터 유사도 기반 북마크 검색 함수
-- Supabase SQL Editor에서 실행
-- ============================================================
create or replace function match_bookmarks(
  query_embedding vector(3072),
  p_user_id       uuid,
  match_threshold float default 0.5,
  match_count     int   default 20
)
returns table (
  id            uuid,
  url           text,
  title         text,
  summary       text,
  thumbnail_url text,
  ai_status     text,
  status        text,
  created_at    timestamptz,
  updated_at    timestamptz,
  similarity    float
)
language sql stable
as $$
  select
    b.id,
    b.url,
    b.title,
    b.summary,
    b.thumbnail_url,
    b.ai_status,
    b.status,
    b.created_at,
    b.updated_at,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  join bookmarks b on b.id = e.bookmark_id
  where
    b.user_id = p_user_id
    and 1 - (e.embedding <=> query_embedding) >= match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
