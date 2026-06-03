# Lot 3 — Réécriture native PocketBase de la couche data

> Décision : **réécriture native** (pas de shim de compat). Chaque service utilise
> le SDK PocketBase (`pb.collection(...).getList/getOne/create/update/delete`).
> Auth serveur : **superuser token** (service account), comme l'ancien service token Directus.
>
> ⚠️ Cette réécriture casse la compilation tant que les 20 fichiers ne sont pas tous
> portés (les exports `rItems`, `directusService`… disparaissent). À mener jusqu'au bout.
>
> Source des patterns : rapport d'exploration de la couche data (commit de cadrage).

---

## 1. Périmètre

- **20 fichiers** dans `src/server/directus/` (à terme renommer `src/server/pb/` au Lot 7).
- **~110 sites d'appel** convergeant vers une poignée de primitives.
- Patterns Directus à traduire : `_eq, _neq, _in, _gte, _lte, _null, _empty, _and, _or`,
  `sort` (`-field`), `search`, `fields` (projection + `.` pour relations), `meta=total_count`,
  `aggregate(count)`, upload `/files`.

**Règle d'or** : on **préserve les signatures publiques** de chaque fonction exportée
(mêmes noms, mêmes types de retour). Seule l'implémentation interne change. Ainsi les
~50 fichiers consommateurs hors `src/server/directus/` ne bougent pas (sauf le cas des
IDs string, voir §6).

---

## 2. Nouvelle API du client (`client.ts` réécrit)

Remplacer l'instance Directus par :

```ts
import 'server-only';
import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL!;
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD!;

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false); // serveur: pas d'annulation auto entre requêtes

// Auth superuser lazy + ré-auth si token expiré
let _authed = false;
export async function pbAdmin(): Promise<PocketBase> {
  if (!pb.authStore.isValid || !_authed) {
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    _authed = true;
  }
  return pb;
}
```

> ⚠️ **Concurrence serveur** : une seule instance `pb` partagée entre requêtes pose un
> risque (authStore global). Option retenue : ré-auth idempotente + `autoCancellation(false)`.
> Si on observe des fuites d'auth entre users, basculer sur un `pb` par requête (factory).
> Pour le Lot 3 (lecture/écriture service, pas de contexte user), l'instance partagée suffit.

**Exports à retirer** (plus de Directus) : `directusService`, `rItems`, `rItem`, `cItem`,
`uItem`, `dItem`, `directusUrl`, `serviceToken`, `DirectusCmsSchema`.
**Exports à conserver/adapter** : `USERS_TABLE` → devient `'users'` (ou retirer au profit de `TABLES.users`).

---

## 3. Helpers transverses à fournir (nouveau `pb-helpers.ts`)

Pour éviter de réécrire les mêmes patterns 110 fois, fournir :

| Helper | Remplace | Signature |
|---|---|---|
| `pbList(collection, opts)` | `rItems` / `directusFetch` GET liste | `(c, {filter?, sort?, fields?, perPage?, page?, expand?}) => Promise<T[]>` |
| `pbOne(collection, id, opts?)` | `rItem` | `(c, id, {fields?, expand?}) => Promise<T \| null>` |
| `pbCreate(collection, data)` | `cItem` | `(c, data) => Promise<T>` |
| `pbUpdate(collection, id, data)` | `uItem` | `(c, id, data) => Promise<T>` |
| `pbDelete(collection, id)` | `dItem` | `(c, id) => Promise<void>` |
| `pbCount(collection, filter?)` | `directusCount` / `aggregate` | `(c, filter?) => Promise<number>` (via `getList(1,1).totalItems`) |
| `pbFirst(collection, filter, opts?)` | `rItems({limit:1})[0]` | `(c, filter, opts?) => Promise<T \| null>` (via `getFirstListItem`) |

**Traducteur de filtres** — le cœur. Directus filter-objet → string PB :

```ts
// Directus: { autor: { _eq: x } }            -> PB: `autor = "x"`
// Directus: { id: { _in: [1,2] } }           -> PB: `(id = 1 || id = 2)`  (ou id ?~ ...)
// Directus: { data: { _gte: t } }            -> PB: `data >= "t"`
// Directus: { x: { _null: true } }           -> PB: `x = null`
// Directus: { _and: [a, b] }                 -> PB: `(A && B)`
// Directus: { _or: [a, b] }                  -> PB: `(A || B)`
```
PB utilise `pb.filter('field = {:v}', {v})` pour l'échappement sûr — à utiliser
systématiquement (jamais de concat brute → injection).

> Décision : écrire `directusFilterToPB(obj)` + tests unitaires sur les ~8 opérateurs.
> C'est la première brique à coder et à valider AVANT les services.

---

## 4. Ordre de portage (imposé par le graphe de dépendances)

```
NIVEAU 0 (socle, aucun dépend d'un service):
  1. client.ts          (instance pb + pbAdmin)
  2. pb-helpers.ts       (NEW: pbList/pbOne/... + directusFilterToPB)

NIVEAU 1 (ne dépendent que du socle):
  3. tables.ts           (retirer LEGACY/USE_V2, garder noms v2)
  4. user-cache.ts       (nick<->id ; dépend client+tables)
  5. fetch.ts            (réécrire directusFetch/directusCount en PB, ou déprécier
                          au profit de pb-helpers ; 7 services l'importent)

NIVEAU 2 (services métier "feuilles" — ordre par importance/risque):
  6. roles.ts            ⭐ simplifie énormément (plus de policies, admin_access bool)
  7. users.ts            ⭐ critique (login en dépend) — getUserByNick, createUser...
  8. legacy-users.ts     (admin users : search, ban, role)
  9. admin-users.ts      (anciennement directus_users → maintenant users + roles)
 10. news.ts             (articles + comments + likes)
 11. forum.ts            (topics + comments + votes + likes) — le plus gros
 12. shop.ts             (items + orders + notifications + moedas)
 13. badges.ts           (user_badges, role badges)
 14. stories.ts          (+ upload fichier → PB files API)
 15. likes.ts            (likes maps)
 16. pseudo-changes.ts   (habbo_nick_history)
 17. team.ts             (users par rôle)
 18. admin.ts            (counts)
 19. admin-logs.ts       (admin_logs + aggregate count)
 20. types.ts            (ajuster types: id string, noms anglais)
```

Après chaque NIVEAU, lancer `npx tsc --noEmit` pour mesurer la dette restante
(les erreurs diminuent à mesure que les services sont portés).

---

## 5. Correspondance des opérations Directus → PocketBase SDK

| Directus | PocketBase SDK |
|---|---|
| `rItems(coll, {filter, sort, fields, limit, offset})` | `pb.collection(coll).getList(page, perPage, {filter, sort, fields, expand})` ou `.getFullList()` |
| `rItem(coll, id, {fields})` | `pb.collection(coll).getOne(id, {fields, expand})` |
| `cItem(coll, data)` | `pb.collection(coll).create(data)` |
| `uItem(coll, id, data)` | `pb.collection(coll).update(id, data)` |
| `dItem(coll, id)` | `pb.collection(coll).delete(id)` |
| `aggregate({count:'*'})` | `pb.collection(coll).getList(1,1,{filter}).totalItems` |
| `directusCount` (`meta=total_count`) | idem `.totalItems` |
| `rItems({limit:1})[0]` | `pb.collection(coll).getFirstListItem(filter)` |
| sort `-data` | sort `-data` (même syntaxe, pratique) |
| `fields=autor,status` | `fields: 'autor,status'` (idem) ; relations via `expand` |
| upload `POST /files` (FormData) | `pb.collection(coll).create(formDataWithFile)` — fichiers attachés au record, PAS de collection `files` séparée |

> ⚠️ **Différence de modèle fichiers** : Directus a une collection `directus_files`
> centrale (UUID). PocketBase attache les fichiers **au record** (champ `file`). Or notre
> schéma stocke les images en **URL texte** (décision plan §7.5, pas de re-upload). Donc
> `stories.uploadFileToDirectus` + `cover_image`/`image` : pour la migration on garde les
> URLs telles quelles. Le re-upload PB (champ file) est hors périmètre Lot 3 — à décider
> séparément si on veut héberger les images dans PB.

---

## 6. Le piège des IDs string (impact hors couche data)

Conséquence du re-séquencement (plan §2.1) : les IDs PB sont des **strings**, pas des entiers.

- Dans la couche data : les fonctions qui faisaient `Number(id)` ou typaient `id: number`
  doivent passer en `string`. Concerne `types.ts` (tous les `id: number`), `user-cache.ts`
  (`resolveUserId: Promise<number>` → `Promise<string>`), `likes.ts` (`Record<number,...>` → `Record<string,...>`).
- **Hors couche data** (à traiter au Lot 5, PAS maintenant) : les 8 points `Number(params.id)`
  recensés dans le plan principal §8bis.2 (pages `news/[id]`, `forum/topic/[id]`, routes API).

> Risque : changer `resolveUserId` en string casse les signatures attendues par les
> consommateurs. À tracer : `grep resolveUserId`, `getLikesMapFor*`. Ajuster en cascade.

---

## 7. Variables d'environnement

Ajouter (déjà dans `.env.local` du worktree pour les scripts) côté app Next.js :
```
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=...
POCKETBASE_ADMIN_PASSWORD=...
```
Retirer (à terme) : `NEXT_PUBLIC_DIRECTUS_URL`, `DIRECTUS_SERVICE_TOKEN`, `USE_V2`,
`USERS_TABLE`, `STORIES_TABLE`, `DIRECTUS_FILES_FOLDER`.

---

## 8. Stratégie de test à chaque palier

1. **Brique filtres** : tests unitaires `directusFilterToPB` (8 opérateurs + combinaisons).
2. **Après socle (client+helpers+tables)** : petit script `npx tsx` qui lit/écrit une
   collection réelle via les nouveaux helpers (ex. créer une `roles`, la lire, la supprimer).
3. **Après chaque service** : `npx tsc --noEmit` (la dette d'erreurs doit décroître).
4. **Fin de Lot 3** : `npm run build` doit passer (compilation complète OK).
   Le runtime (login, pages) sera testé au Lot 4/5 (auth) une fois les données migrées (Lot 6).

---

## 9. Livrables Lot 3

- `client.ts` réécrit (instance pb + pbAdmin superuser)
- `pb-helpers.ts` (NEW) : pbList/pbOne/pbCreate/pbUpdate/pbDelete/pbCount/pbFirst + `directusFilterToPB`
- `tables.ts` simplifié (noms v2 only)
- 15 services métier portés en SDK natif
- `types.ts` ajusté (id string)
- `npm run build` qui passe

## 10. Ce qui n'est PAS dans le Lot 3 (pour mémoire)

- Auth (login, middleware, sessions) → Lot 4
- Composants client / hook useUser → Lot 5
- Migration des données → Lot 6
- Rename `directus/` → `pb/`, retrait deps Directus, cleanup env → Lot 7
- Re-upload des images dans le storage PB → décision séparée
