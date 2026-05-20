-- Switch legacy `/uploads/...` media references to Supabase object paths
-- after the files have been uploaded to `directus-uploads/uploads/...`.
--
-- Run after scripts/supabase/sync-legacy-uploads.ps1.

set search_path to habbonex_main, public;

with updated as (
  update articles
  set cover_image = regexp_replace(cover_image, '^/uploads/', 'uploads/')
  where cover_image like '/uploads/%'
  returning id
)
select 'articles.cover_image' as field, count(*) as normalized_rows from updated;

with updated as (
  update stories
  set image = regexp_replace(image, '^/uploads/', 'uploads/')
  where image like '/uploads/%'
  returning id
)
select 'stories.image' as field, count(*) as normalized_rows from updated;

with updated as (
  update shop_items
  set image = regexp_replace(image, '^/uploads/', 'uploads/')
  where image like '/uploads/%'
  returning id
)
select 'shop_items.image' as field, count(*) as normalized_rows from updated;

with updated as (
  update sponsors
  set image = regexp_replace(image, '^/uploads/', 'uploads/')
  where image like '/uploads/%'
  returning id
)
select 'sponsors.image' as field, count(*) as normalized_rows from updated;

select 'article_legacy_upload_refs' as check_name, count(*) from articles
where cover_image like '/uploads/%'
union all
select 'story_legacy_upload_refs', count(*) from stories
where image like '/uploads/%'
union all
select 'shop_legacy_upload_refs', count(*) from shop_items
where image like '/uploads/%'
union all
select 'sponsor_legacy_upload_refs', count(*) from sponsors
where image like '/uploads/%';
