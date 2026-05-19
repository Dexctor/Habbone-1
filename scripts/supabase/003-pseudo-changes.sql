create table if not exists habbonex_main.pseudo_changes (
  id bigserial primary key,
  habbo_unique_id text not null,
  old_nick text not null,
  new_nick text not null,
  hotel text not null default 'fr',
  user_id integer references habbonex_main.users(id) on delete set null,
  changed_at integer not null default extract(epoch from now())::integer
);

create index if not exists idx_pseudo_changes_unique_hotel_changed
  on habbonex_main.pseudo_changes (habbo_unique_id, hotel, changed_at desc);

create index if not exists idx_pseudo_changes_changed
  on habbonex_main.pseudo_changes (changed_at desc);
