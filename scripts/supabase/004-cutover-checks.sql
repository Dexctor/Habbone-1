-- Supabase cutover checks for Habbone.
-- Run with:
-- docker run --rm -v "${PWD}:/repo" postgres:17 \
--   psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/004-cutover-checks.sql

set search_path to habbonex_main, public;

select 'articles' as table_name, count(*) from articles
union all select 'article_comments', count(*) from article_comments
union all select 'article_comment_likes', count(*) from article_comment_likes
union all select 'forum_topics', count(*) from forum_topics
union all select 'forum_comments', count(*) from forum_comments
union all select 'forum_comment_likes', count(*) from forum_comment_likes
union all select 'forum_topic_votes', count(*) from forum_topic_votes
union all select 'shop_items', count(*) from shop_items
union all select 'shop_orders', count(*) from shop_orders
union all select 'stories', count(*) from stories
union all select 'users', count(*) from users
union all select 'user_badges', count(*) from user_badges
union all select 'badges', count(*) from badges
union all select 'sponsors', count(*) from sponsors
union all select 'pseudo_changes', count(*) from pseudo_changes
order by table_name;

select id, title, cover_image, status, published_at, created_at
from articles
order by greatest(coalesce(published_at, '-infinity'::timestamp), coalesce(created_at, '-infinity'::timestamp)) desc, id desc
limit 10;

select id, title, image, author, status, published_at, created_at
from stories
order by coalesce(published_at, created_at) desc, id desc
limit 10;

select 'article_orphan_comments' as check_name, count(*) from article_comments c
left join articles a on a.id = c.article
where a.id is null
union all
select 'forum_orphan_comments', count(*) from forum_comments c
left join forum_topics t on t.id = c.topic
where t.id is null
union all
select 'shop_orphan_orders', count(*) from shop_orders o
left join shop_items i on i.id = o.item
where i.id is null;

select 'article_like_duplicates' as check_name, count(*) from (
  select comment, "user", count(*)
  from article_comment_likes
  group by comment, "user"
  having count(*) > 1
) x
union all
select 'forum_comment_like_duplicates', count(*) from (
  select comment, "user", count(*)
  from forum_comment_likes
  group by comment, "user"
  having count(*) > 1
) x
union all
select 'forum_topic_vote_duplicates', count(*) from (
  select topic, "user", count(*)
  from forum_topic_votes
  group by topic, "user"
  having count(*) > 1
) x;

select 'article_legacy_upload_refs' as check_name, count(*) from articles
where cover_image like '/uploads/%' or cover_image like 'uploads/%'
union all
select 'story_legacy_upload_refs', count(*) from stories
where image like '/uploads/%' or image like 'uploads/%'
union all
select 'shop_legacy_upload_refs', count(*) from shop_items
where image like '/uploads/%' or image like 'uploads/%'
union all
select 'sponsor_legacy_upload_refs', count(*) from sponsors
where image like '/uploads/%' or image like 'uploads/%';

select 'article_bare_uuid_refs' as check_name, count(*) from articles
where cover_image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
union all
select 'story_bare_uuid_refs', count(*) from stories
where image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
union all
select 'shop_bare_uuid_refs', count(*) from shop_items
where image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
union all
select 'sponsor_bare_uuid_refs', count(*) from sponsors
where image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
