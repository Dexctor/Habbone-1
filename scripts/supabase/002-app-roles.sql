create table if not exists habbonex_main.app_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  admin_access boolean not null default false,
  app_access boolean not null default true,
  sort integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_roles_name_lower on habbonex_main.app_roles (lower(name));
create index if not exists idx_app_roles_sort_name on habbonex_main.app_roles (sort nulls last, name);

insert into habbonex_main.app_roles (name, description, admin_access, app_access, sort)
values
  ('Fondateur', 'Acces complet au panel admin', true, true, 0),
  ('Responsable', 'Equipe responsable', true, true, 1),
  ('Animateurs', 'Equipe animation', true, true, 2),
  ('Journaliste', 'Equipe redaction', true, true, 3),
  ('Correcteur', 'Equipe correction', true, true, 4),
  ('Configurateur Wired', 'Equipe wired', true, true, 5),
  ('Constructeur', 'Equipe construction', true, true, 6),
  ('Graphiste', 'Equipe graphisme', true, true, 7),
  ('Member', 'Membre standard', false, true, 100)
on conflict (name) do update
set
  description = excluded.description,
  admin_access = excluded.admin_access,
  app_access = excluded.app_access,
  sort = excluded.sort,
  updated_at = now();
