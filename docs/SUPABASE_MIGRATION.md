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

Troisième tranche :

- lectures boutique ;
- CRUD items boutique ;
- commandes boutique ;
- achat avec débit coins et décrément stock conditionnels ;
- notifications admin boutique.

Quatrième tranche :

- auth/login ;
- inscription ;
- profil éditable ;
- vérification Habbo ;
- mot de passe oublié/changement mot de passe ;
- coins utilisateur/admin ;
- statistiques utilisateurs.

Cinquième tranche :

- sponsors/partenaires ;
- stories côté lecture/écriture DB ;
- upload de fichiers stories encore conservé sur Directus pour éviter de changer le flux fichier avant validation du bucket média.

Sixième tranche :

- uploads publics/admin/stories/theme vers Supabase Storage quand `DATA_BACKEND=supabase` ;
- CRUD admin news/forum ;
- rôles applicatifs via `app_roles` ;
- team, badges, ranking, pseudo changes et logs admin via Supabase.

Avant d'activer `DATA_BACKEND=supabase`, appliquer aussi :

```powershell
cd "D:\Coding project\Keystone habbonne\habbone-admin\habbonedirectus"

docker run --rm `
  -v "${PWD}:/repo" `
  postgres:17 `
  psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/001-users-twitter.sql

docker run --rm `
  -v "${PWD}:/repo" `
  postgres:17 `
  psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/002-app-roles.sql

docker run --rm `
  -v "${PWD}:/repo" `
  postgres:17 `
  psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/003-pseudo-changes.sql
```

Important : si les utilisateurs ont deja des `directus_role_id` venant de Directus, il faut soit importer les anciens UUID dans `app_roles`, soit reassocier les utilisateurs aux nouveaux roles depuis le panel admin avant de couper Directus.
