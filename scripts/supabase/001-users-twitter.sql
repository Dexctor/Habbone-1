alter table habbonex_main.users
  add column if not exists twitter varchar(120);

create index if not exists idx_users_twitter
  on habbonex_main.users (twitter)
  where twitter is not null and twitter <> '';
