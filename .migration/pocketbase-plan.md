# Plan de migration — Directus → PocketBase (backend complet)

> **Branche de travail** : `migration/pocketbase-clean` (créée depuis `main` @ `c51d21f`)
> **Base** : `main` (contient déjà toute la migration v2 + 41 commits de correctifs).
> **Périmètre validé** : PocketBase devient le **backend complet**, auth native incluse.
> NextAuth est **retiré**. C'est l'option la plus lourde des deux — ce plan en tient compte.
>
> Doc sœur de référence : [`schema-v2.md`](./schema-v2.md) (le modèle de données, déjà conçu).

---

## 0. TL;DR — ce qui rend ce chantier faisable

- **Le modèle de données est déjà entièrement spécifié** dans `schema-v2.md` (17 collections, champs, relations, enums). Il a été pensé pour Directus mais transpose presque 1:1 vers PocketBase.
- **Le couplage data est centralisé** : 3 fichiers (`client.ts`, `fetch.ts`, `tables.ts`) + ~16 appels SDK. Swap propre.
- **Volume de données ridicule** : 302 lignes au total (cf. `schema-v2.md §4`). Aucune contrainte de perf/batch.
- **Le vrai coût, c'est l'auth** : retirer NextAuth touche **27 fichiers**. C'est 70 % de l'effort de ce plan. À découper en lots.

---

## 1. État des lieux du couplage actuel

### 1.1 Couche d'accès aux données (faible couplage — bonne nouvelle)

| Fichier | Rôle actuel | Action PocketBase |
|---|---|---|
| `src/server/directus/client.ts` | Instancie SDK Directus + `staticToken` | Réécrire : client PB + auth service |
| `src/server/directus/fetch.ts` | `directusFetch()` / `directusCount()` (REST) | Réécrire : 2 helpers → API PB |
| `src/server/directus/tables.ts` | Mapping noms collections + colonnes (`USE_V2`) | Simplifier : garder noms v2, retirer `LEGACY` |
| 20 services `src/server/directus/*.ts` | Logique métier, passent par les helpers ci-dessus | Quasi inchangés si les helpers gardent la même signature |

- **Seulement 4 fichiers** importent directement `@directus/sdk`.
- **~16 appels SDK** au total (`readItems`×2, `readItem`×2, `createItem`×2, `updateItem`×2, `deleteItem`×2, `aggregate`×6).
- Stratégie : **garder la signature des helpers** (`directusFetch` → `pbFetch` avec API identique) pour ne pas toucher les 20 services. Idéalement, renommer le dossier `src/server/directus/` → `src/server/pb/` en fin de parcours (cosmétique).

### 1.2 Couche auth (fort couplage — le chantier)

NextAuth est présent dans **27 fichiers** :

- **Cœur** : `src/auth.ts` (provider Credentials + callbacks JWT/session), `middleware.ts` (garde `/profile`, `/admin` via `getToken`), `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`.
- **Helpers serveur** : `src/server/authz.ts`, `src/server/admin-guards.ts`, `src/server/api-helpers.ts`, `src/server/actions/admin-content.ts`.
- **Client** : `src/components/Providers.tsx` (SessionProvider), `AuthMenu.tsx`, `header-tw.tsx`, `UserBarLeft.tsx`, `RegisterModal.tsx`, `ImagerClient.tsx`, `sad-avatar.tsx`.
- **Pages/routes consommant la session** : `admin/layout.tsx`, `admin/page.tsx`, `profile/page.tsx`, `settings/page.tsx`, `boutique/page.tsx`, `news/[id]/page.tsx`, `forum/topic/[id]/page.tsx`, + routes API `user/me`, `user/moedas`, `user/change-password`, `admin/users/[id]/history`, `news`.

Ce que fait `auth.ts` aujourd'hui (à reproduire en PocketBase) :
1. Login par `nick` + `password` (bcrypt, avec auto-upgrade des vieux hash non-bcrypt).
2. Checks `banido` / `ativado`.
3. Snapshot Habbo + détection de changement de pseudo (effets de bord non-bloquants).
4. Résolution du rôle (`directus_role_id` → nom + `admin_access`) + fallback `ADMIN_NICKS` à péremption.
5. Attribution auto du badge de rôle.
6. Sérialise tout dans le JWT puis la session (`id, nick, avatar, missao, hotel, role, directusRoleId/Name/AdminAccess`).

---

## 2. Schéma PocketBase (transposition de `schema-v2.md`)

17 collections. Règle de transposition Directus → PocketBase :

| Concept Directus (schema-v2) | Équivalent PocketBase |
|---|---|
| Collection standard | Collection type `base` |
| `users` (table métier) | Collection type **`auth`** ← change tout pour l'auth (voir §3) |
| M2O `author → users` | Champ `relation` (single, `maxSelect: 1`) |
| UUID `directus_files` | Champ `file` (ou `url` texte si on garde le stockage externe) |
| enum `draft\|published` | Champ `select` (`maxSelect: 1`, values = enum) |
| `boolean` | Champ `bool` |
| `timestamp` date-created/updated | Champs système PB `created` / `updated` (auto) |
| PK `integer` auto-incrément | ⚠️ PB utilise des **IDs string 15-char** par défaut |

### 2.1 IDs — ✅ DÉCIDÉ : re-séquencement propre

`schema-v2.md §6.4` voulait conserver les IDs legacy. **Décision prise : on re-séquence.**
PocketBase génère ses IDs string aléatoires de 15 caractères ; on les laisse faire.

Conséquences assumées :
- Les anciennes URLs publiques `/articles/97`, `/forum/3` **cassent**. Acceptable (site communautaire, faible volume, peu de liens entrants).
- ⚠️ **Action requise** : les routes dynamiques (`news/[id]`, `forum/topic/[id]`, etc.) attendent aujourd'hui un **entier**. À adapter pour accepter un **id string PB**. À recenser dans le Lot 1.
- ⚠️ Le mapping `nick → id` (§5) produit désormais un dict `nick → pbId (string)`, et les relations M2O pointent vers ces IDs string. Pas de champ `legacy_id` à maintenir.
- Avantage : zéro indirection, modèle PB pur.

### 2.2 Liste des collections (détail complet dans `schema-v2.md §3`)

`users` (auth), `articles`, `article_comments`, `article_comment_likes`, `article_categories`, `forum_categories`, `forum_topics`, `forum_comments`, `forum_comment_likes`, `forum_topic_votes`, `stories`, `sponsors`, `shop_items`, `shop_orders`, `badges`, `user_badges`, `admin_notifications`, `admin_logs`, `habbo_nick_history`.

> Pour chaque collection, les champs sont déjà tabulés dans `schema-v2.md §3.1 → §3.17`. Le script de création (§5) les reprend tels quels en syntaxe PB.

### 2.3 `users` en collection `auth` — champs additionnels

PB fournit nativement `email`, `password` (hash), `verified`, `emailVisibility`, tokenKey. On **ajoute** les champs métier de `schema-v2 §3.1` : `nick` (unique), `avatar_url`, `background_url`, `mission`, `coins`, `points`, `active`, `banned`, `ban_reason`, `ban_expires_at`, `ban_admin`, `last_login_*`, `habbo_unique_id`, `habbo_hotel`, `habbo_verified_at`, `role` (relation → collection de rôles).

> ⚠️ Le login actuel se fait par **`nick`**, pas par email. PB `auth` supporte l'**authWithPassword** sur un champ identifiant configurable (`nick` ou `email`). À configurer : autoriser l'auth par `nick`.

---

## 3. Auth — le cœur du chantier

### 3.1 Modèle cible

- Collection `users` type **`auth`** → PB gère sessions, tokens, refresh, règles d'accès par collection.
- **Rôles** — ✅ DÉCIDÉ : **collection `roles` custom** (relation depuis `users.role`) + champ `admin_access` bool. Garde la logique métier existante (le code lit déjà `admin_access`, cf. `auth.ts:84`). Collection `roles` à créer **avant** `users` (cible de la relation). Champs : `id`, `name`, `admin_access` (bool), + ce qui existe dans `directus_roles` aujourd'hui (à recenser au Lot 1).
- **Bcrypt** : les hash legacy sont en bcrypt. PB hash aussi en bcrypt → **les hash sont importables tels quels** dans le champ `password` (via l'API admin à l'import, cf. §5). L'auto-upgrade des vieux hash non-bcrypt de `auth.ts` devient inutile (PB impose bcrypt).

### 3.2 Remplacement, fichier par fichier

| Fichier NextAuth | Devient |
|---|---|
| `src/auth.ts` | Supprimé. Logique de login → fonction serveur `pbLogin(nick, password)` qui appelle `pb.collection('users').authWithPassword()` + reproduit les checks ban/activation + effets de bord Habbo/badge. |
| `middleware.ts` | Garde le matcher `/profile`, `/admin`. Remplace `getToken()` par lecture/validation du cookie d'auth PB (`pb_auth`) + `pb.authStore.isValid`. Conserve **tout le bloc CSP/headers** tel quel. |
| `api/auth/[...nextauth]/route.ts` | Supprimé. Remplacé par routes `api/auth/login`, `api/auth/logout`, `api/auth/me` (ou Server Actions). |
| `types/next-auth.d.ts` | Supprimé → type `SessionUser` maison. |
| `server/authz.ts`, `admin-guards.ts`, `api-helpers.ts` | Réécrire la résolution de session : depuis le cookie PB côté serveur au lieu de `getServerSession`. |
| `components/Providers.tsx` | Retirer `SessionProvider`. Mettre un contexte PB maison (ou TanStack Query) exposant `user`. |
| `AuthMenu`, `UserBarLeft`, `header-tw`, `RegisterModal`, `ImagerClient`, `sad-avatar` | Remplacer `useSession()` par le hook maison `useUser()`. `signIn/signOut` → appels aux nouvelles routes/actions. |
| Pages serveur (`admin/*`, `profile`, `settings`, `boutique`, `news/[id]`, `forum/topic/[id]`) | Remplacer `getServerSession` par helper `getSession()` (lecture cookie PB côté serveur). |

### 3.3 Points de vigilance auth

- **JWT vs cookie PB** : NextAuth stockait un JWT signé `NEXTAUTH_SECRET`. PB renvoie son propre token ; on le stocke en cookie httpOnly. Le middleware doit valider ce cookie (idéalement appel léger `pb.collection('users').authRefresh()` ou vérif locale du JWT PB).
- **Effets de bord du login** (snapshot Habbo, `syncHabboName`, `ensureRoleBadge`) : les déplacer dans `pbLogin`, garder le caractère **non-bloquant** (`void ...`).
- **Fallback `ADMIN_NICKS` à péremption** (`ADMIN_NICKS_UNTIL`) : reproduire tel quel pour le bootstrap admin.
- **`emailVisibility` / champs nullables** : certains users legacy n'ont pas d'email (`schema-v2 §3.1` : email nullable). PB `auth` tolère email vide si l'identifiant de login est `nick` — à vérifier/configurer.

---

## 4. Couche d'accès aux données — réécriture des helpers

### 4.1 `client.ts`
```ts
// avant: createDirectus(url).with(staticToken(t)).with(rest())
// après:
import PocketBase from 'pocketbase';
export const pb = new PocketBase(process.env.POCKETBASE_URL!);
// auth service via token admin ou compte service dédié (à décider)
```

### 4.2 `fetch.ts` — garder la signature pour ne pas toucher les 20 services
- `directusFetch<T>(path, opts)` → `pbFetch<T>(collection, query)` mappant filtres/sort/expand PB.
- `directusCount(collection, filter)` → `pb.collection(c).getList(1, 1, { filter }).then(r => r.totalItems)`.
- ⚠️ **Syntaxe des filtres diffère** : Directus `filter[field][_eq]=x` → PB `filter="field = 'x'"`. C'est le point technique principal. Recenser tous les filtres utilisés dans les 20 services et écrire un petit traducteur ou réécrire au cas par cas (volume faible).

### 4.3 `tables.ts`
- Retirer la branche `LEGACY` et le flag `USE_V2` (plus de legacy en PB).
- Garder le `TableMap` v2 comme **source unique des noms de collections**.
- Les `*_COLS` (mapping colonnes) : en v2 les colonnes sont déjà en anglais → simplifier en constantes directes.

### 4.4 Les ~16 appels SDK directs
Dans les 4 fichiers (`client.ts`, `admin-logs.ts`, `legacy-users.ts`, `roles.ts`) : remplacer `readItems/createItem/...` par les méthodes PB (`pb.collection(c).getList/create/update/delete`). `aggregate` (×6) → `getList` + `totalItems` ou champ agrégé.

---

## 5. Scripts de migration de données

Les 3 scripts `scripts/migration/0{1,2,3}-*.ts` actuels parlent à l'**API Directus** → **à réécrire pour PB**, mais leur **logique est réutilisable** (cf. `schema-v2.md §5, §6`).

- **`01-create-collections.ts`** → créer les collections via l'API admin PB (`POST /api/collections`), idempotent. Définir champs/relations/règles d'accès. ⚠️ ordre : créer `users` et `roles` d'abord (cibles des relations).
- **`02-migrate-data.ts`** (avec `--dry-run`) → lire le dump legacy, transformer, écrire dans PB. Reprendre de `schema-v2.md` :
  - Mapping `nick → id` (§6.1) — mais désormais id PB string, donc dict `nick → pbId`.
  - Conversion dates Unix→ISO (§6.2).
  - Bcrypt importé tel quel dans le champ `password` PB (§6.3) — via API admin (création de record auth avec hash pré-calculé : vérifier que PB l'accepte sans re-hash ; sinon import SQL direct dans le fichier PB SQLite).
  - `legacy_id` conservé en champ indexé (cf. §2.1 option A).
- **`03-backfill-content.ts`** → idem logique existante, API PB.
- `package.json` : scripts `pb:migrate:create`, `pb:migrate:data`, `pb:migrate:data:dry`.

> ⚠️ **Import des hash bcrypt** : c'est le point à dérisquer en premier (POC). Si l'API PB re-hash à la création, fallback = insertion SQL directe dans la base SQLite PB. À tester sur 1 user avant d'industrialiser.

---

## 6. Ordre d'exécution proposé (lots)

1. **Lot 0 — Setup** : faire tourner une instance PocketBase (locale puis VPS), variables d'env (`POCKETBASE_URL`, token admin). Ajouter `pocketbase` (SDK JS) au `package.json`.
2. **Lot 1 — Schéma** : `01-create-collections.ts`, valider les 17 collections + règles d'accès dans l'admin PB. (Dépend de la décision IDs §2.1.)
3. **Lot 2 — POC hash bcrypt** : importer 1 user, vérifier `authWithPassword(nick, pwd)`. Dérisque l'auth.
4. **Lot 3 — Couche data** : `client.ts` + `fetch.ts` + `tables.ts` + les 16 appels SDK. Les 20 services doivent compiler sans changement de signature.
5. **Lot 4 — Auth serveur** : `pbLogin`, `getSession`, `middleware.ts`, `authz/admin-guards/api-helpers`, routes `api/auth/*`. (Le plus gros lot.)
6. **Lot 5 — Auth client** : `Providers`, hook `useUser`, les 7 composants client, pages serveur consommant la session.
7. **Lot 6 — Migration données** : `02` + `03` en `--dry-run`, vérif mapping, puis réel.
8. **Lot 7 — Nettoyage** : retirer `next-auth` de `package.json`, supprimer `auth.ts` / `[...nextauth]` / `next-auth.d.ts`, renommer `server/directus/` → `server/pb/`.

---

## 7. Décisions

### ✅ Tranchées
1. **IDs** (§2.1) : **re-séquencement propre**. URLs entières cassent, routes `[id]` à adapter en string.
2. **Rôles** (§3.1) : **collection `roles` custom** avec `admin_access`.
3. **Hébergement** : **PocketBase en local d'abord**, VPS plus tard.

### ⏳ Encore à valider (avant Lot 1 / Lot 4)
4. **Login par `nick`** : confirmer l'auth PB sur le champ `nick` (pas email) — vu que des users n'ont pas d'email. *(Très probablement oui, simple confirmation.)*
5. **Stockage fichiers** : garder les URLs/UUID existants en champ texte (pas de re-upload) — le plus simple — ou migrer dans le storage PB ?
6. **Contexte client** (Lot 5) : hook `useUser` maison (léger) ou TanStack Query si déjà présent dans le projet ?

---

## 8. Risques identifiés

| Risque | Gravité | Mitigation |
|---|---|---|
| Import des hash bcrypt re-hashés par PB | Élevé | POC Lot 2 avant tout ; fallback insertion SQLite directe |
| 27 fichiers auth → régressions de session/garde admin | Élevé | Découpage en lots 4/5, tester `/admin` et `/profile` à chaque étape |
| Traduction des filtres Directus→PB incomplète | Moyen | Recenser tous les filtres des 20 services avant d'écrire `pbFetch` |
| URLs publiques cassées si re-séquencement IDs | Moyen | Décision §7.1 (option A) |
| Effets de bord login (Habbo/badge) oubliés | Faible | Checklist §3.3, repris dans `pbLogin` |

---

## 8 bis. Recensement Lot 1 (préparé — ne dépend pas d'une instance PB)

### 8bis.1 Champs réels de `directus_roles` → collection PB `roles`

Source : `src/server/directus/roles.ts` + `types.ts`. La collection PB `roles` doit porter :

| Champ PB | Type | Source Directus | Note |
|---|---|---|---|
| `id` | string (auto PB) | `id` (UUID) | re-séquencé (string PB) |
| `name` | text (required) | `name` | |
| `description` | text (nullable) | `description` | |
| `admin_access` | bool | `admin_access` | **voir simplification ci-dessous** |
| `app_access` | bool | `app_access` | conservé pour parité |

> 🔑 **Simplification majeure côté PB.** En **Directus v11+, `admin_access` a migré des rôles vers les *policies*** : `roles.ts` contient ~100 lignes (`fetchPoliciesForRole`, `getAllPolicies`, `resolveRoleAccess`, cache TTL) juste pour résoudre `admin_access` en agrégeant les policies d'un rôle. **En PocketBase, ce concept n'existe pas** : `admin_access` redevient un simple champ `bool` sur `roles`. → Toute cette mécanique de policies **disparaît**. `getRoleById()` se réduit à un `pb.collection('roles').getOne(id)`.

Les fonctions de `roles.ts` à réécrire (versions PB, bien plus courtes) : `listRoles`, `createRole`, `updateRole`, `getRoleById`, `setUserRole`.

### 8bis.2 Points couplés à un ID entier → à passer en string PB

Conséquence du re-séquencement (§2.1). Tous ces `Number(...)` sur un id doivent accepter une **string PB** :

**Pages serveur :**
- `src/app/news/[id]/page.tsx` — `Number(id || 0)` (L31), + `Number(comment.id)` (L68, 199, 203)
- `src/app/forum/topic/[id]/page.tsx` — `Number(id || 0)` (L57), + `Number(comment.id)` (L96, 214, 219)
- `src/app/forum/post/[id]/page.tsx` — `Number(id)` (L12), `Number(post.id_topico)` (L18), `Number(c.id)` (L23, 45)

**Routes API :**
- `api/forum/comments/[id]/like/route.ts` (L7), `.../report/route.ts` (L7)
- `api/forum/topic/[id]/comments/route.ts` (L14)
- `api/forum/topics/[id]/vote/route.ts` (L7)
- `api/news/[id]/comments/route.ts` (L18)
- `api/news/comments/[id]/like/route.ts` (L7)

> ⚠️ Impact en cascade : les **relations M2O** (`id_noticia`, `id_topico`, `id_forum`, `comment`, `user`…) deviennent des **clés string** côté PB. Les `likesMap[Number(...)]` (maps indexées par id entier) doivent être ré-indexées par string. À traiter dans le Lot 5 (consommation), pas au Lot 1.

### 8bis.3 Squelette du script de création
Le script existant `scripts/migration/01-create-collections.ts` (Directus) sert de **modèle structurel** : chargement `.env.local`, helper fetch authentifié, `collectionExists()` idempotent, définitions de schéma séparées. Le squelette PB reprend cette ossature mais cible l'API PB (`POST /api/collections`) et l'auth admin PB. Voir `scripts/migration-pb/01-create-collections.ts`.

---

## 9. Ce qui est DÉJÀ fait / réutilisable

- ✅ Modèle de données complet (`schema-v2.md`) — 17 collections spécifiées.
- ✅ Couche data centralisée (3 fichiers + 16 appels) — faible surface.
- ✅ Logique de migration (séquencement, dates, nick→id, bcrypt) — décrite, à re-porter sur l'API PB.
- ✅ Branche `migration/pocketbase-clean` créée depuis `main`.
- ✅ Volume négligeable (302 lignes) — aucune contrainte technique de scale.
