-- Ensure newly posted comments always receive a visible publication date.
--
-- Run from the repo root:
--   docker run --rm -v "${PWD}:/repo" postgres:17 \
--   psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/007-comment-created-at-defaults.sql

set search_path to habbonex_main, public;

alter table article_comments
  alter column created_at set default now();

alter table forum_comments
  alter column created_at set default now();

with updated as (
  update article_comments
  set created_at = now()
  where created_at is null
  returning id
)
select 'article_comments_backfilled' as field, count(*) as rows from updated;

with updated as (
  update forum_comments
  set created_at = now()
  where created_at is null
  returning id
)
select 'forum_comments_backfilled' as field, count(*) as rows from updated;

select 'article_comments_missing_created_at' as check_name, count(*) from article_comments where created_at is null
union all
select 'forum_comments_missing_created_at', count(*) from forum_comments where created_at is null;
