# Notes de migration — session 2026-04-23

## Statut

| Collection | Lignes legacy | Lignes v2 | Différence |
|---|---|---|---|
| `users` ← `usuarios` | 23 | 23 | ✅ |
| `article_categories` ← `noticias_cat` | 34 | 34 | ✅ |
| `articles` ← `noticias` | 97 | **97** | ✅ (après ALTER TABLE body LONGTEXT) |
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

## Articles manquants → résolus ✅

Les 7 articles qui avaient échoué à cause de la limite TEXT (65KB) de
Directus sur les colonnes body/content ont été récupérés après un
`ALTER TABLE ... MODIFY COLUMN ... LONGTEXT` exécuté manuellement sur
les 4 collections concernées :

```sql
ALTER TABLE articles MODIFY COLUMN body LONGTEXT;
ALTER TABLE forum_topics MODIFY COLUMN body LONGTEXT;
ALTER TABLE article_comments MODIFY COLUMN content LONGTEXT;
ALTER TABLE forum_comments MODIFY COLUMN content LONGTEXT;
```

Ces ALTER devront être rejoués si l'on reconstruit l'environnement depuis
zéro. Voir `scripts/migration/01-create-collections.ts` pour une éventuelle
amélioration future : forcer `longtext` dès la création (Directus ne le
supporte pas natif aujourd'hui, un workaround via l'endpoint schema pourrait
être ajouté).

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
