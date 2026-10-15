-- ============================================================
-- SmartMark — Collections (공유 폴더) 스키마
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. collections 테이블
CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. collection_members 테이블
-- role: 'owner' | 'editor' | 'viewer'
CREATE TABLE IF NOT EXISTS collection_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by    UUID REFERENCES auth.users(id),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, user_id)
);

-- 3. collection_bookmarks 테이블
CREATE TABLE IF NOT EXISTS collection_bookmarks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  bookmark_id   UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  added_by      UUID NOT NULL REFERENCES auth.users(id),
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, bookmark_id)
);

-- ============================================================
-- RLS (Row Level Security) 활성화
-- ============================================================

ALTER TABLE collections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_bookmarks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 정책 — collections
-- ============================================================

-- 멤버인 경우 조회 가능
CREATE POLICY "collections_select"
  ON collections FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_id = collections.id AND user_id = auth.uid()
    )
  );

-- owner만 생성
CREATE POLICY "collections_insert"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- owner만 수정
CREATE POLICY "collections_update"
  ON collections FOR UPDATE
  USING (auth.uid() = owner_id);

-- owner만 삭제
CREATE POLICY "collections_delete"
  ON collections FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- RLS 정책 — collection_members
-- ============================================================

-- 같은 컬렉션 멤버라면 멤버 목록 조회 가능
CREATE POLICY "members_select"
  ON collection_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection_members cm
      WHERE cm.collection_id = collection_members.collection_id
        AND cm.user_id = auth.uid()
    )
  );

-- owner만 멤버 추가
CREATE POLICY "members_insert"
  ON collection_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE id = collection_id AND owner_id = auth.uid()
    )
  );

-- owner만 역할 변경
CREATE POLICY "members_update"
  ON collection_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE id = collection_id AND owner_id = auth.uid()
    )
  );

-- owner가 멤버 제거 OR 본인이 탈퇴
CREATE POLICY "members_delete"
  ON collection_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM collections
      WHERE id = collection_id AND owner_id = auth.uid()
    )
  );

-- ============================================================
-- RLS 정책 — collection_bookmarks
-- ============================================================

-- 멤버라면 조회 가능
CREATE POLICY "col_bookmarks_select"
  ON collection_bookmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_id = collection_bookmarks.collection_id
        AND user_id = auth.uid()
    )
  );

-- editor 이상이면 북마크 추가 가능
CREATE POLICY "col_bookmarks_insert"
  ON collection_bookmarks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_id = collection_bookmarks.collection_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- editor 이상이면 북마크 제거 가능
CREATE POLICY "col_bookmarks_delete"
  ON collection_bookmarks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_id = collection_bookmarks.collection_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 컬렉션 생성 시 owner를 members에 자동 추가 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO collection_members (collection_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_collection_created
  AFTER INSERT ON collections
  FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();
