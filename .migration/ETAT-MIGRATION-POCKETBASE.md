# État migration Directus → PocketBase (reprise après compactage)

> Dernière mise à jour : session du déploiement VPS + crise ni-host.
> Branche de travail : `migration/pocketbase-clean` (poussée sur GitHub
> Dexctor/Habbone-1, ~43 commits).

## 🔴 URGENT — le DNS de habbone.fr est TOMBÉ

- **Symptôme** : `pb.habbone.fr` ne résout plus (`ESERVFAIL`), tous les liens
  `*.habbone.fr` cassent, le site est down côté domaine.
- **Cause** : les serveurs DNS de `habbone.fr` étaient chez **ni-host**
  (`magic.ni-host.com` / `poney.ni-host.com`). ni-host a coupé (abonnement
  client expiré) → les nameservers sont morts → plus de résolution DNS.
- **Le VPS + PocketBase + données sont INTACTS** : l'IP `37.59.101.4` répond.
  C'est UNIQUEMENT le DNS qui est cassé, pas l'hébergement.
- **SOLUTION** : migrer le DNS de `habbone.fr` vers OVH. Le domaine est chez
  **OVH** (registrar = OVH confirmé via whois), seuls les nameservers pointent
  vers ni-host. Il faut les **accès OVH du client** (en attente) pour :
  1. activer/configurer la zone DNS OVH
  2. recréer les enregistrements (voir plus bas)
  3. basculer les nameservers ni-host → OVH (chez OVH manager)

### Enregistrements DNS à recréer chez OVH
```
pb.habbone.fr    A   37.59.101.4    (VPS OVH — PocketBase) ← CRITIQUE
api.habbone.fr   A   37.59.101.4    (VPS OVH — Directus, secours)
habbone.fr       → Vercel (le nouveau front ; ancien site PHP ni-host = mort)
www.habbone.fr   → Vercel
```
Pas d'emails @habbone.fr à conserver (confirmé client). Ignorer MX/webmail/cpanel/ftp.

## Architecture cible (validée)
- **Front Next.js** → Vercel (projet `habbone`, prod actuelle = branche `main`
  sur Directus ; preview = branche `migration/pocketbase-clean` sur PocketBase)
- **BDD + images** → PocketBase sur VPS OVH (`pb.habbone.fr` → 127.0.0.1:8090,
  systemd, nginx + certbot HTTPS)
- Directus (api.habbone.fr:8055, Docker sur le VPS) = encore allumé, secours.

## Accès / identifiants
- **VPS OVH** : `ssh root@37.59.101.4` (hostname vps-c7adf3fb)
- **PocketBase superuser / dashboard** (https://pb.habbone.fr/_/) :
  `antoinedewas@outlook.fr` / `1502901201` (⚠️ mot de passe FAIBLE, à changer)
- **`.env.vps`** (gitignored, à la racine worktree) : POCKETBASE_URL=https://pb.habbone.fr
  + admin email/password. Sert aux scripts de migration ciblant le VPS.
- **`.env.local`** (worktree) : config PB locale + NEXTAUTH. Le `.env.local` du
  **dépôt principal** contient encore NEXT_PUBLIC_DIRECTUS_URL + DIRECTUS_SERVICE_TOKEN
  (utilisés par les scripts pour lire le legacy Directus).
- **Vercel** : CLI connecté (`vercel` v54+, user `dexctor`). 3 vars POCKETBASE_*
  ajoutées en Preview scopées sur la branche. NEXTAUTH_SECRET/URL déjà présents.

## ✅ Ce qui est FAIT (migration complète et fonctionnelle)
- **Schéma** : 20 collections PB + `uploads`. Toutes ont reçu le champ système
  `created` (autodate) au step 11 — était manquant et cassait plein de tris (400
  silencieux). roles = collection avec `admin_access` bool.
- **Données migrées** (depuis Directus api.habbone.fr, scripts dans
  `scripts/migration-pb/`) : 22 users (+bcrypt importé via SQL/hashes.sql),
  97 articles, 34 cat articles, 13 cat forum, 3 topics forum, 5+commentaires
  (9 orphelins normaux), 7 commentaires articles, 9 stories, 3 sponsors,
  3 shop_items, 13 badges, 59 notifications, 10 rôles (Fondateur=admin).
- **Auth** : NextAuth gardé, `authorize` valide via `verifyLogin` (authWithPassword
  PB). Login testé OK. Rate-limit ajouté. testadmin/Test1234! = compte admin de test.
- **Rôles** : migrés + réassignés (Decrypt = Fondateur = admin). Step 10.
- **Couche data** : 20 services `src/server/directus/*` réécrits en PB natif
  (pb-helpers.ts, pb-filter.ts traduit les filtres Directus→PB). client.ts = pb +
  pbAdmin superuser. IDs PB = STRINGS (corrigés partout, ex liens /forum/topic/X).
- **Build** : `npm run build` passe (0 erreur TS).
- **Images** : re-hébergées sur PocketBase (collection uploads) — couvertures
  d'articles + 74 images de contenu récupérées via Wayback. Avatars = API Habbo (OK).
- **Backup** : manuel téléchargé en local (`~/Documents/habbone-backups/
  habbone_pocketbase_2026-06-15.zip`, 36 Mo, 417 fichiers) + backups AUTO
  quotidiens configurés (cron `0 3 * * *`, garde 7).

## ⚠️ Ce qui RESTE / perdu
- **DNS** : voir section URGENT (bloqué sur accès OVH client).
- **283 images de contenu** (dans le body des articles) cassées : étaient sur
  ni-host, NON archivées sur Wayback. Récupérables UNIQUEMENT si le client
  réactive ni-host quelques jours (avant suppression définitive ~2-4 semaines).
  Script de rapatriement à adapter de `09-rehost-images.ts` (qui ne traitait que
  cover_image) pour scanner aussi les <img> dans body.
- **Bascule prod** : faire pointer habbone.fr → Vercel + vars POCKETBASE_* en
  Production + merge dans main. À faire APRÈS migration DNS et tests OK.
- **Mot de passe PB superuser faible** (`1502901201`) à renforcer (puis MAJ
  .env.vps + var Vercel POCKETBASE_ADMIN_PASSWORD).
- **Nettoyage cosmétique** (optionnel) : renommer src/server/directus/ → pb/,
  retirer deps @directus/sdk, code mort media-url.ts (fallback Directus inerte).

## Scripts de migration (scripts/migration-pb/, ré-exécutables, --dry-run dispo)
- `_pb.ts` (client/helpers schéma), `01a-01e` (création collections),
  `02-poc-bcrypt.ts`, `03-migrate-users.ts` + `03b-users-no-sql-api.ts` (users
  +hashes.sql pour le VPS), `04-migrate-content.ts`, `05-migrate-missing.ts`
  (commentaires+stories), `06-fix-story-images.ts`, `07-fix-statuses.ts`,
  `08-fix-article-images.ts`, `09-rehost-images.ts`, `10-migrate-roles.ts`,
  `11-add-created-field.ts`, `12-recover-wayback.ts`.
- Lancer ciblé VPS : `node --env-file=.env.vps --import tsx scripts/migration-pb/XX.ts`
- ⚠️ `/api/sql` est DÉSACTIVÉ en prod PB (404) → import bcrypt via sqlite3 sur le VPS.
- ⚠️ stub `node_modules/server-only` (no-op) nécessaire pour lancer les tests tsx
  (à recréer après npm install).
