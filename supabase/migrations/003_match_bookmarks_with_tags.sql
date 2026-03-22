-- ============================================================
-- match_bookmarks v2: 태그 필터 지원 추가
-- p_tags가 null이면 기존과 동일하게 전체 검색
-- p_tags가 있으면 해당 태그 중 하나라도 가진 북마크만 검색 (OR)
-- ============================================================

-- 기존 오버로드 제거 (파라미터 시그니처가 다르면 CREATE OR REPLACE로 교체 불가)
drop function if exists match_bookmarks(vector, uuid, float, int);

create or replace function match_bookmarks(
  query_embedding vector(3072),
  p_user_id       uuid,
  match_threshold float    default 0.65,
  match_count     int      default 10,
  p_tags          text[]   default null
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
    -- p_tags가 null이면 조건 없음, 있으면 해당 태그 중 하나 이상 포함한 북마크만
    and (
      p_tags is null
      or exists (
        select 1
        from bookmark_tags bt
        join tags t on t.id = bt.tag_id
        where bt.bookmark_id = b.id
          and t.name = any(p_tags)
      )
    )
  order by similarity desc
  limit match_count;
$$;
