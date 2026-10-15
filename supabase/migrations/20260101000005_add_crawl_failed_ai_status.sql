alter table bookmarks
drop constraint if exists bookmarks_ai_status_check;

alter table bookmarks
add constraint bookmarks_ai_status_check
check (
  ai_status in (
    'crawling',
    'processing',
    'completed',
    'failed',
    'crawl_failed'
  )
);
