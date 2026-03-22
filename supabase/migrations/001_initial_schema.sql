-- ============================================================
-- Smart Bookmark — Initial Schema (docs/015 기반)
-- Supabase SQL Editor에서 전체 실행
-- ============================================================

-- 1. pgvector 확장 (임베딩용)
create extension if not exists "vector";

-- ============================================================
-- 2. bookmarks
-- ============================================================
create table if not exists bookmarks (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade,
  url           text        not null,
  title         text,
  summary       text,
  status        text        not null default 'unread' check (status in ('unread', 'read')),
  thumbnail_url text,
  user_memo     text,
  ai_status     text        not null default 'crawling' check (ai_status in ('crawling', 'processing', 'completed', 'failed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 기존 테이블에 불필요한 컬럼이 있으면 제거
alter table bookmarks drop column if exists tags;
alter table bookmarks drop column if exists content;
alter table bookmarks drop column if exists temp_user_id;

-- ============================================================
-- 3. embeddings (bookmarks 1:1, 벡터 분리)
-- ============================================================
create table if not exists embeddings (
  id          uuid         primary key default gen_random_uuid(),
  bookmark_id uuid         not null unique references bookmarks(id) on delete cascade,
  embedding   vector(3072) not null,
  created_at  timestamptz  not null default now()
);

-- 벡터 유사도 검색용 IVFFlat 인덱스
-- (데이터 1000건 이상 쌓이면 활성화 권장)
-- create index on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- 4. tags
-- ============================================================
create table if not exists tags (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. bookmark_tags (N:M 중간 테이블)
-- ============================================================
create table if not exists bookmark_tags (
  bookmark_id uuid not null references bookmarks(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  primary key (bookmark_id, tag_id)
);

-- ============================================================
-- 6. updated_at 자동 갱신 트리거
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookmarks_updated_at on bookmarks;
create trigger bookmarks_updated_at
  before update on bookmarks
  for each row execute function update_updated_at();

-- ============================================================
-- 7. RLS (Row Level Security)
-- ============================================================
alter table bookmarks     enable row level security;
alter table embeddings    enable row level security;
alter table tags          enable row level security;
alter table bookmark_tags enable row level security;

-- bookmarks: 본인 데이터만
drop policy if exists "bookmarks_select" on bookmarks;
drop policy if exists "bookmarks_insert" on bookmarks;
drop policy if exists "bookmarks_update" on bookmarks;
drop policy if exists "bookmarks_delete" on bookmarks;
create policy "bookmarks_select" on bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_update" on bookmarks for update using (auth.uid() = user_id);
create policy "bookmarks_delete" on bookmarks for delete using (auth.uid() = user_id);

-- embeddings: bookmarks 소유자만
drop policy if exists "embeddings_select" on embeddings;
drop policy if exists "embeddings_insert" on embeddings;
drop policy if exists "embeddings_delete" on embeddings;
create policy "embeddings_select" on embeddings for select
  using (exists (select 1 from bookmarks where bookmarks.id = embeddings.bookmark_id and bookmarks.user_id = auth.uid()));
create policy "embeddings_insert" on embeddings for insert
  with check (exists (select 1 from bookmarks where bookmarks.id = embeddings.bookmark_id and bookmarks.user_id = auth.uid()));
create policy "embeddings_delete" on embeddings for delete
  using (exists (select 1 from bookmarks where bookmarks.id = embeddings.bookmark_id and bookmarks.user_id = auth.uid()));

-- tags: 인증 유저 읽기/쓰기 (AI 자동 생성)
drop policy if exists "tags_select" on tags;
drop policy if exists "tags_insert" on tags;
create policy "tags_select" on tags for select using (auth.role() = 'authenticated');
create policy "tags_insert" on tags for insert with check (auth.role() = 'authenticated');

-- bookmark_tags: bookmarks 소유자만
drop policy if exists "bookmark_tags_select" on bookmark_tags;
drop policy if exists "bookmark_tags_insert" on bookmark_tags;
drop policy if exists "bookmark_tags_delete" on bookmark_tags;
create policy "bookmark_tags_select" on bookmark_tags for select
  using (exists (select 1 from bookmarks where bookmarks.id = bookmark_tags.bookmark_id and bookmarks.user_id = auth.uid()));
create policy "bookmark_tags_insert" on bookmark_tags for insert
  with check (exists (select 1 from bookmarks where bookmarks.id = bookmark_tags.bookmark_id and bookmarks.user_id = auth.uid()));
create policy "bookmark_tags_delete" on bookmark_tags for delete
  using (exists (select 1 from bookmarks where bookmarks.id = bookmark_tags.bookmark_id and bookmarks.user_id = auth.uid()));

-- ============================================================
-- 8. 인덱스
-- ============================================================
create index if not exists bookmarks_user_id_idx   on bookmarks(user_id);
create index if not exists bookmarks_ai_status_idx  on bookmarks(ai_status);
create index if not exists bookmark_tags_tag_id_idx on bookmark_tags(tag_id);
-- ============================================================
-- 9. public.users (Auth와 연동되는 프로필 테이블)
-- ============================================================
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select" on public.users;
drop policy if exists "users_update" on public.users;
create policy "users_select" on public.users for select using (auth.uid() = id);
create policy "users_update" on public.users for update using (auth.uid() = id);

-- OAuth 로그인 시 자동으로 public.users에 insert
drop trigger if exists on_auth_user_created on auth.users;
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, avatar_url)
  values (new.id, new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();