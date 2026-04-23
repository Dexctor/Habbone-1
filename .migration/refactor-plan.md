# Plan de refactor USE_V2 — état et suite

## Contexte

La migration des données (phase 2) est **terminée** : 18 collections v2
peuplées, IDs legacy conservés. Les deux schémas cohabitent côté BDD.

La phase 3 est le **refactor du code applicatif** pour basculer d'une paire
de tables à l'autre via l'env var `USE_V2`. Objectif : quand on passe
`USE_V2=true` sur Vercel, toute l'app tape sur les nouvelles collections
sans régression, et si ça casse on repasse à `false` en 30 secondes.

## État actuel

### ✅ Fait

- **`src/server/directus/tables.ts`** : helper centralisé qui résout le
  nom de chaque collection selon `USE_V2`. Source unique de vérité pour
  les 17 tables concernées. Exporte aussi quelques maps de colonnes
  (`NEWS_COLS`, `FORUM_TOPIC_COLS`, etc.) pour les callers simples.

- **`src/server/directus/news.ts`** : entièrement refactoré. Les types
  publics (`NewsRecord`, `NewsCommentRecord`) **restent portugais** pour
  minimiser l'impact sur les callers ; la traduction v2→legacy se fait
  dans le service. Écritures et lectures couvertes :
  - `adminListNews` / `getPublicNews` / `getPublicNewsById` / `listPublicNewsForCards`
  - `adminCreateNews` / `adminUpdateNews` / `adminDeleteNews`
  - `listNewsByAuthorService` (résolution nick → user id en v2)
  - `adminListNewsComments` / `createNewsComment` / `adminUpdate/DeleteNewsComment`
  - `toggleNewsCommentLike` (table `article_comment_likes` avec colonnes M2O)
  - `getPublicNewsComments`
  - `listPublicNewsBadges` (parse HTML pour extraire les badges d'articles)

### 🔶 À faire (ordre suggéré)

1. **`src/server/directus/forum.ts`** — même traitement que news.ts. Plus
   gros (topics + posts + comments + votes + likes + rapports + catégories).
   Estimation : 450 → ~700 lignes.

2. **`src/server/directus/stories.ts`** — écriture + lecture stories. Petit.

3. **`src/server/directus/shop.ts`** — items, orders, admin notifications.
   Déjà bien structuré, le refactor est mécanique.

4. **`src/server/directus/legacy-users.ts` + `users.ts`** — le plus sensible.
   Concerne l'auth NextAuth. Garder un œil particulier sur les hashes
   bcrypt (juste préserver `senha` → `password`) et sur la résolution de
   rôle (`directus_role_id` préservé).

5. **`src/server/directus/badges.ts`** — emblemas / emblemas_usuario →
   badges / user_badges. Mapping simple.

6. **`src/server/directus/pseudo-changes.ts`** — legacy table vide, v2
   `habbo_nick_history`. Aucune donnée à préserver, juste aligner l'écriture.

7. **`src/app/api/admin/pub/route.ts`** — parceiros → sponsors. Requêtes
   fetch directes à moderniser.

8. **`src/app/api/admin/users/[id]/history/route.ts`** — 4 tables legacy
   tapées en dur. Redirection via `TABLES.*`.

9. **`src/app/api/ranking/route.ts`** — 4 tables legacy. Redirection via
   `TABLES.*`.

10. **`src/app/admin/page.tsx`** — 4 `adminCount(table)` à rediriger.

11. **`src/server/services/admin-users.ts`** — search avec mapping
    portugais. Déjà structuré, refactor mécanique.

12. **`src/auth.ts`** — NextAuth authorize. Lecture de `usuarios.senha`
    et écriture de `last_login_*`. **Dernier point à refactorer** car
    toute régression impacte directement les connexions utilisateurs.

## Approche par fichier

Pattern retenu dans `news.ts` et à reproduire ailleurs :

```ts
import { TABLES, USE_V2 } from './tables';

const SELECT_FIELDS = USE_V2
  ? ['id', 'title', 'body', 'author', 'created_at']
  : ['id', 'titulo', 'conteudo', 'autor', 'data'];

async function v2ToLegacy(row: V2Row): Promise<LegacyRecord> {
  /* column rename + author M2O -> nick resolution */
}

export async function fetchSomething() {
  const rows = await directusService.request(
    rItems(TABLES.articles, { fields: SELECT_FIELDS } as any),
  );
  if (!USE_V2) return rows as LegacyRecord[];
  return Promise.all((rows as V2Row[]).map(v2ToLegacy));
}
```

## Caches

Le cache `userCache: Map<id, nick>` dans `news.ts` est local au module.
Dupliquer le pattern dans chaque service qui doit résoudre M2O author →
nick serait OK pour l'instant. Si ça devient trop lourd, extraire dans
`./user-cache.ts` (5 min de travail).

## Tests de non-régression

Avant de flipper `USE_V2=true` sur Vercel :

1. `USE_V2=true npm run dev` en local, brancher sur le Directus prod.
2. Checklist :
   - Page d'accueil charge (articles + forum récents + stories)
   - Page d'un article : le contenu s'affiche, les commentaires listent
   - Forum : topics listés, ouverture d'un topic, commenter
   - Boutique : items listés, achat (créer un order)
   - Profile /profile/[nick] : last login, avatar, badges affichés
   - Admin panel : users list, stats, ban/unban
3. Tous les tests unitaires doivent passer (`npm test`).
4. Aucune erreur dans les logs Vercel après 30 minutes de traffic nominal.

## Stratégie de bascule

Une fois que `USE_V2=true` est stable en prod pendant 48h :
- Exécuter un nettoyage côté Directus pour dropper les tables legacy
  vides (60 tables) et celles qui ont été migrées (17 tables).
- Garder le dump SQL et le flag `USE_V2` pendant 1 semaine de sûreté.
- Finalement, supprimer l'import de `./tables.ts` et hardcoder les noms
  v2 partout (branche `post-migration-cleanup`).

## Pourquoi pas tout faire dans une seule session ?

Refactor complet estimé : 2 000 lignes modifiées sur ~15 fichiers. À ce
volume, des régressions subtiles deviennent inévitables sans une suite
de tests d'intégration que l'on n'a pas aujourd'hui. Faire chaque
service une fois, le tester, et passer au suivant est plus lent mais
beaucoup plus fiable.
