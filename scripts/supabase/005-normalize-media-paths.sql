-- Normalize legacy Directus media references after files have been uploaded
-- to the public Supabase Storage bucket `directus-uploads`.
--
-- It fixes rows that still store a bare Directus file UUID, for example:
--   6c7bf4ba-d7e1-49ca-ad49-08aff99b04b0
-- into the matching Supabase Storage object name, for example:
--   6c7bf4ba-d7e1-49ca-ad49-08aff99b04b0.png
--
-- Run with:
-- docker run --rm -v "${PWD}:/repo" postgres:17 \
--   psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/005-normalize-media-paths.sql

set search_path to habbonex_main, public;

create or replace function habbonex_main.resolve_directus_storage_object(value text)
returns text
language sql
stable
as $$
  select obj.name
  from storage.objects obj
  where obj.bucket_id = 'directus-uploads'
    and (
      obj.name like value || '.%'
      or obj.name like value || '\_\_%' escape '\'
    )
  order by
    case
      when obj.name like value || '.%' then 0
      else 1
    end,
    obj.created_at desc nulls last,
    obj.name asc
  limit 1
$$;

with updated as (
  update stories s
  set image = habbonex_main.resolve_directus_storage_object(s.image)
  where s.image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and habbonex_main.resolve_directus_storage_object(s.image) is not null
  returning s.id
)
select 'stories.image' as field, count(*) as normalized_rows from updated;

with updated as (
  update articles a
  set cover_image = habbonex_main.resolve_directus_storage_object(a.cover_image)
  where a.cover_image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and habbonex_main.resolve_directus_storage_object(a.cover_image) is not null
  returning a.id
)
select 'articles.cover_image' as field, count(*) as normalized_rows from updated;

with updated as (
  update shop_items i
  set image = habbonex_main.resolve_directus_storage_object(i.image)
  where i.image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and habbonex_main.resolve_directus_storage_object(i.image) is not null
  returning i.id
)
select 'shop_items.image' as field, count(*) as normalized_rows from updated;

with updated as (
  update sponsors s
  set image = habbonex_main.resolve_directus_storage_object(s.image)
  where s.image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and habbonex_main.resolve_directus_storage_object(s.image) is not null
  returning s.id
)
select 'sponsors.image' as field, count(*) as normalized_rows from updated;

select 'remaining_bare_story_uuid' as check_name, count(*) from stories
where image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
union all
select 'remaining_bare_article_uuid', count(*) from articles
where cover_image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
union all
select 'remaining_bare_shop_uuid', count(*) from shop_items
where image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
union all
select 'remaining_bare_sponsor_uuid', count(*) from sponsors
where image ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
