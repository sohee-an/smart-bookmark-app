-- ============================================================
-- 007. embeddings 정책/스키마 드리프트 정리
-- ============================================================
-- 배경 (실측: pg_policies / information_schema / pg_get_functiondef):
--   실제 DB에는 초기 세팅의 구식 정책 "Users access own embeddings"(ALL,
--   auth.uid() = user_id)와 legacy user_id 컬럼이 남아 있었고,
--   001의 embeddings_select/insert/delete 정책은 미적용 상태였다.
--   앱은 insert 시 user_id를 보내지 않으므로(001 스키마 기준) 모든 임베딩
--   INSERT가 RLS WITH CHECK 위반으로 조용히 실패해 왔다.
--
-- 판정 근거: match_bookmarks는 bookmarks 조인(b.user_id = p_user_id)으로
--   소유권을 판정하며 embeddings.user_id를 사용하지 않는다.
--   → 001 설계(북마크 소유권 기반 EXISTS)로 통일하고 legacy를 제거한다.

-- 1) 구식 ALL 정책 제거
drop policy if exists "Users access own embeddings" on embeddings;

-- 2) 001 기준 정책 적용 (update는 006에서 이미 생성됨)
drop policy if exists "embeddings_select" on embeddings;
create policy "embeddings_select" on embeddings for select
  using (
    exists (
      select 1 from bookmarks
      where bookmarks.id = embeddings.bookmark_id
        and bookmarks.user_id = auth.uid()
    )
  );

drop policy if exists "embeddings_insert" on embeddings;
create policy "embeddings_insert" on embeddings for insert
  with check (
    exists (
      select 1 from bookmarks
      where bookmarks.id = embeddings.bookmark_id
        and bookmarks.user_id = auth.uid()
    )
  );

drop policy if exists "embeddings_delete" on embeddings;
create policy "embeddings_delete" on embeddings for delete
  using (
    exists (
      select 1 from bookmarks
      where bookmarks.id = embeddings.bookmark_id
        and bookmarks.user_id = auth.uid()
    )
  );

-- 3) legacy 컬럼 제거 (이를 참조하던 정책을 1)에서 먼저 제거했으므로 안전)
alter table embeddings drop column if exists user_id;
