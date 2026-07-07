-- ============================================================
-- 006. embeddings UPDATE 정책 추가 (소유자 한정)
-- ============================================================
-- 배경: saveEmbedding이 upsert(onConflict: bookmark_id)로 동작하는데,
-- 기존 행이 있는 재저장(재크롤·재시도) 시 DO UPDATE 경로를 타면서
-- UPDATE 정책이 없어 "row-level security policy" 위반으로 실패했다.
--
-- tags / bookmark_tags 는 앱에서 DO NOTHING(ignoreDuplicates)으로 바꿔
-- UPDATE 권한 자체가 필요 없으므로 정책을 넓히지 않는다. (RLS 최소 권한 유지)

drop policy if exists "embeddings_update" on embeddings;
create policy "embeddings_update" on embeddings for update
  using (
    exists (
      select 1 from bookmarks
      where bookmarks.id = embeddings.bookmark_id
        and bookmarks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from bookmarks
      where bookmarks.id = embeddings.bookmark_id
        and bookmarks.user_id = auth.uid()
    )
  );
