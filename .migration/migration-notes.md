# Notes de migration — session 2026-04-23

## Statut

| Collection | Lignes legacy | Lignes v2 | Différence |
|---|---|---|---|
| `users` ← `usuarios` | 23 | 23 | ✅ |
| `article_categories` ← `noticias_cat` | 34 | 34 | ✅ |
| `articles` ← `noticias` | 97 | **90** | ⚠️ 7 manquants |
| `article_comments` ← `noticias_coment` | 7 | 7 | ✅ |
| `article_comment_likes` ← `noticias_coment_curtidas` | 12 | 9 | ℹ️ 3 likes sans auteur résoluble, ignorés |
| `forum_categories` ← `forum_cat` | 13 | 13 | ✅ |
| `forum_topics` ← `forum_topicos` | 3 | 3 | ✅ |
| `forum_comments` ← `forum_coment` | 14 | 14 | ✅ |
| `forum_comment_likes` ← `forum_coment_curtidas` | 6 | 5 | ℹ️ 1 like orphelin |
| `forum_topic_votes` ← `forum_topicos_votos` | 4 | 3 | ℹ️ 1 vote orphelin |
| `stories` ← `usuarios_storie` | 9 | 9 | ✅ |
| `sponsors` ← `parceiros` | 3 | 3 | ✅ |
| `shop_items` ← `shop_itens` | 3 | 3 | ✅ |
| `shop_orders` ← `shop_itens_mobis` | 5 | 5 | ✅ |
| `badges` ← `emblemas` | 13 | 13 | ✅ |
| `user_badges` ← `emblemas_usuario` | 30 | 30 | ✅ |
| `admin_notifications` ← `acp_notificacoes` | 59 | 59 | ✅ |

## 7 articles non migrés (à réparer)

La colonne `articles.body` est créée par Directus en type `TEXT` (max 65KB).
Les 7 articles ci-dessous ont un HTML qui dépasse cette limite à cause
d'**images base64 inline** dans le corps du texte.

| Legacy ID | Titre |
|---|---|
| 18 | Achetez votre Mascotte Canard |
| 29 | Nouveau mobis NFT : Action Figure Noob |
| 31 | Le Calendrier des cadeaux est de retour |
| 40 | Pack Feu Follet |
| 41 | DR Sports: Coupe du monde féminine |
| 42 | Pack Maison De Bonnie Blond À Malibu |
| 49 | Rare Statue De Lion Gardien |

### Options pour récupérer ces articles

**Option A — Nettoyer le HTML source côté `noticias`** (recommandé)
Remplacer les `<img src="data:image/png;base64,...">` par de vraies URLs
(upload dans Directus files puis pointer sur l'asset). Ensuite relancer
`npm run migrate:data`.

**Option B — Agrandir la colonne `body` côté MySQL** (hack temporaire)
Se connecter en SSH au VPS et exécuter :
```sql
ALTER TABLE articles MODIFY COLUMN body LONGTEXT;
-- idem pour les tables qui pourraient en souffrir
ALTER TABLE forum_topics MODIFY COLUMN body LONGTEXT;
ALTER TABLE article_comments MODIFY COLUMN content LONGTEXT;
ALTER TABLE forum_comments MODIFY COLUMN content LONGTEXT;
```
Puis relancer `npm run migrate:data`. Directus acceptera les gros contenus.

**Option C — Ignorer**
Ces articles sont peu importants (promotions de mobiliers datées). Tu peux
les considérer comme archivés et ne pas les migrer. L'app v2 continuera
sans eux.

## Warnings (auteurs non résolus, non bloquants)

- 2 articles dont l'auteur legacy n'existe plus dans `usuarios` → insérés avec `author=null`
- 1 topic forum idem
- 1 comment forum idem
- 5 likes/votes orphelins (auteur supprimé) → filtrés, non insérés

Aucun impact sur l'UX — les comptes d'auteurs affichés seront "Anonyme" ou le nick legacy stocké en texte sur l'ancienne table.

## Prochaines étapes

1. Refactor des services `src/server/directus/*.ts` pour pointer sur les nouvelles collections, piloté par la variable d'environnement `USE_V2`.
2. Test côté app en local avec `USE_V2=true`.
3. Activation du flag sur Vercel.
4. Observation 24-48h.
5. Après stabilité, drop des tables legacy inutilisées.
