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

## Stratégie code

Le code conserve les imports existants `@/server/directus/*` pour limiter le blast radius. Les services publics basculent vers Supabase seulement si `DATA_BACKEND=supabase`.

Première tranche :

- lectures publiques news ;
- création de commentaires news ;
- toggle likes commentaires news ;
- lecture des compteurs likes news/forum ;
- support remote images Supabase Storage dans `next.config.ts`.
