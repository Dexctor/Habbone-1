# Migration Supabase

Branche de travail : `codex/supabase-migration`.

## Variables Vercel preview

Garder Directus actif par défaut. Activer Supabase uniquement sur une preview dédiée.

```env
DATA_BACKEND=supabase
SUPABASE_DB_URL=postgresql://...
SUPABASE_DB_SCHEMA=habbonex_main
SUPABASE_DB_POOL_MAX=4
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
```

Pour les médias, ne passer à Supabase qu'après avoir validé les chemins publics :

```env
NEXT_PUBLIC_MEDIA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_UPLOADS_BASE=https://<project-ref>.supabase.co/storage/v1/object/public/directus-uploads
```

## Etat de migration

- DB V2 importée dans le schéma `habbonex_main`.
- Bucket public `directus-uploads` créé et fichiers uploadés.
- Index de lecture ajoutés.
- Commentaires orphelins archivés dans `_migration_orphan_article_comments` et `_migration_orphan_forum_comments`.
- Contraintes uniques/FK critiques ajoutées.

## Voir les tables dans Supabase

Les tables ont été importées dans le schéma `habbonex_main`, pas dans `public`.

Si le Table Editor ne montre aucune table, vérifier d'abord dans SQL Editor :

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'habbonex_main'
order by table_name;
```

Pour les rendre visibles dans l'API Supabase/PostgREST, exposer le schéma `habbonex_main` dans les réglages API du projet, ou garder l'accès serveur direct via `SUPABASE_DB_URL`.

## Stratégie code

Le code conserve les imports existants `@/server/directus/*` pour limiter le blast radius. Les services publics basculent vers Supabase seulement si `DATA_BACKEND=supabase`.

Première tranche :

- lectures publiques news ;
- création de commentaires news ;
- toggle likes commentaires news ;
- lecture des compteurs likes news/forum ;
- support remote images Supabase Storage dans `next.config.ts`.

Deuxième tranche :

- lectures publiques forum ;
- création de topics/commentaires forum ;
- toggle likes commentaires forum ;
- votes topics forum ;
- catégories forum.
