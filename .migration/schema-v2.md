# Schema Directus v2 — design propre

Ce document propose un **nouveau schéma** pour remplacer les tables legacy
HabboneX. Objectifs :

1. Noms et types cohérents, tout en **anglais**.
2. Relations **déclarées** (M2O Directus natif), pas par nick.
3. Un seul format de date : `timestamp` ISO via le special `date-created` / `date-updated`.
4. Booléens : vrais `boolean`, pas `ENUM('s','n')`.
5. Enums en minuscules anglaises : `active | suspended | draft` etc.
6. Charset : **utf8mb4 partout**.
7. Permissions Directus Policies → lisibles et maintenables.

---

## 1. Stratégie : tables "v2" côte à côte

On **ne touche PAS** les tables legacy. On crée des nouvelles collections en
parallèle avec préfixe ou nom distinct. Une fois la bascule OK, on drop les
anciennes.

Avantages :
- Zéro downtime
- Rollback trivial (un env var `USERS_TABLE=users` → `usuarios`)
- Directus gère la création des tables SQL sous le capot

## 2. Nommage des collections v2

| Legacy | v2 | Remarque |
|---|---|---|
| `usuarios` | `users` | conflit avec `directus_users` évité |
| `noticias` | `articles` | nom standard CMS |
| `noticias_coment` | `article_comments` | |
| `noticias_coment_curtidas` | `article_comment_likes` | |
| `forum_cat` | `forum_categories` | |
| `forum_topicos` | `forum_topics` | |
| `forum_coment` | `forum_comments` | |
| `forum_coment_curtidas` | `forum_comment_likes` | |
| `forum_topicos_votos` | `forum_topic_votes` | |
| `usuarios_storie` | `stories` | |
| `parceiros` | `sponsors` | |
| `shop_itens` | `shop_items` | |
| `shop_itens_mobis` | `shop_orders` | |
| `emblemas` | `badges` | renommer + recharger le code |
| `emblemas_usuario` | `user_badges` | |
| `acp_notificacoes` | `admin_notifications` | |
| `admin_logs` | `admin_logs` | inchangé (déjà propre) |
| `pseudo_changes` | `habbo_nick_history` | plus explicite |

---

## 3. Collections v2 détaillées

### 3.1 `users`

Remplace `usuarios`. Seulement les champs utiles.

| Champ | Type | Legacy | Notes |
|---|---|---|---|
| `id` | integer PK auto | `id` | |
| `nick` | string (unique, not null) | `nick` | |
| `email` | string (nullable) | `email` | |
| `password` | string (not null) | `senha` | bcrypt préservé tel quel |
| `avatar_url` | string | `avatar` | |
| `background_url` | string | `background` | |
| `mission` | string | `missao` | bio user |
| `coins` | integer, default 0 | `moedas` | |
| `points` | integer, default 0 | `pontos` | |
| `active` | boolean, default true | `ativado='s'` | |
| `banned` | boolean, default false | `banido='s'` | |
| `ban_reason` | text (nullable) | `ban_motivo` | |
| `ban_expires_at` | timestamp (nullable) | `ban_termino` | converti unix→ISO |
| `ban_admin` | string (nullable) | `ban_autor` | nick de l'admin |
| `last_login_at` | timestamp (nullable) | `acesso_data` | converti |
| `last_login_ip` | string (nullable) | `acesso_ip` | |
| `last_login_ua` | string (nullable) | `acesso_ua` | |
| `created_at` | timestamp (auto, date-created) | `data_criacao` | converti |
| `habbo_unique_id` | string (unique, nullable) | `habbo_unique_id` | déjà moderne |
| `habbo_hotel` | string (not null) | `habbo_hotel` | |
| `habbo_verified_at` | timestamp (nullable) | `habbo_verified_at` | |
| `role` | M2O → `directus_roles` | `directus_role_id` | **vraie relation** au lieu de string |

**Champs legacy supprimés** :
`facebook_id`, `nome`, `assinatura`, `tarja`, `placar`, `facebook`, `twitter`,
`instagram`, `discord`, `pontos_campanha*`, `equipe_campanha`, `quartos_pontos`,
`vip*`, `pixel_grupo`, `radio_presencas`, `ativado_data`, `habbo_verification_*`
(4 champs code-flow plus utiles), `moedas_alt`, `role` (string — remplacé par M2O).

### 3.2 `articles`

Remplace `noticias`.

| Champ | Type | Legacy |
|---|---|---|
| `id` | integer PK | `id` |
| `title` | string (not null) | `titulo` |
| `slug` | string (unique, indexed) | *généré depuis titre* |
| `summary` | string | `descricao` |
| `cover_image` | UUID → `directus_files` | `imagem` |
| `body` | text | `noticia` |
| `category` | M2O → `article_categories` | `cat_id` |
| `status` | enum `draft \| published \| archived` | `status` |
| `pinned` | boolean | `fixo='s'` |
| `comments_enabled` | boolean default true | `comentarios='s'` |
| `views` | integer default 0 | `views` |
| `author` | M2O → `users` | `autor` (nick → id lookup) |
| `published_at` | timestamp | `data` converti |
| `created_at` / `updated_at` | auto | |

**Supprimés** : `tags` (inutilisé), `evento_*` (5 champs non utilisés),
`emblema`, `blog_id`, `views_ips` (bizarrerie), `autor` comme string.

### 3.3 `article_comments`

| Champ | Type | Legacy |
|---|---|---|
| `id` | integer PK | `id` |
| `article` | M2O → `articles` | `id_noticia` |
| `author` | M2O → `users` | `autor` (nick→id) |
| `content` | text | `comentario` |
| `likes_count` | integer default 0 | |
| `status` | enum `active \| hidden \| deleted` | `status` |
| `created_at` | auto | `data` converti |

### 3.4 `article_comment_likes`

| Champ | Type |
|---|---|
| `id` | PK |
| `comment` | M2O → `article_comments` |
| `user` | M2O → `users` |
| `created_at` | auto |

Unicité sur `(comment, user)`.

### 3.5 `forum_categories`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `name` | string | — à remapper du dump |
| `slug` | string | |
| `description` | string | |
| `icon` | string | |
| `sort` | integer | |
| `active` | boolean | |

### 3.6 `forum_topics`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `title` | string | `titulo` |
| `body` | text | `conteudo` |
| `cover_image` | UUID files | `imagem` |
| `category` | M2O → `forum_categories` | `cat_id` |
| `author` | M2O → `users` | `autor` nick→id |
| `pinned` | boolean | `fixo='s'` |
| `locked` | boolean | `fechado='s'` |
| `locked_reason` | text | `fechado_motivo` |
| `locked_by` | M2O → `users` | `fechado_autor` |
| `locked_at` | timestamp | `fechado_data` converti |
| `views` | integer | `views` |
| `status` | enum `active \| hidden` | `status` |
| `created_at` | auto | `data` converti |
| `updated_at` | auto | `editado_data` |

**Supprimés** : `views_ip`, `moderado`, `mod_*` (redondant avec `locked_*`),
`status_autor`, `status_data` (pas utilisé par l'app), `data_ativo`.

### 3.7 `forum_comments`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `topic` | M2O → `forum_topics` | `id_forum` |
| `author` | M2O → `users` | `autor` |
| `content` | text | `comentario` |
| `likes_count` | integer default 0 | `curtida` |
| `status` | enum `active \| hidden \| deleted` | `status` |
| `created_at` | auto | `data` converti |

### 3.8 `forum_comment_likes` / `forum_topic_votes`

Idem article_comment_likes : `(comment, user)` ou `(topic, user, value)`.

### 3.9 `stories`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `title` | string | *inexistant dans legacy — à extraire* |
| `image` | UUID files | `image` |
| `author` | M2O → `users` | `autor` |
| `status` | enum `public \| hidden \| draft` | `status` |
| `published_at` | timestamp | `published_at` (déjà moderne) |
| `created_at` | auto | `data` converti |

### 3.10 `sponsors`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `name` | string | `nome` |
| `link` | string | `link` |
| `image` | string/UUID | `imagem` |
| `active` | boolean | `status='ativo'` |
| `sort` | integer | *nouveau* |
| `created_by` | M2O → users | `autor` |
| `created_at` | auto | `data` converti |

### 3.11 `shop_items`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `name` | string | `nome` |
| `description` | text | — |
| `image` | string | `imagem` |
| `price_coins` | integer | `preco_moedas` |
| `stock` | integer | `qtd_disponivel` |
| `sold_count` | integer default 0 | `qtd_comprado` |
| `free` | boolean | `gratis='s'` |
| `active` | boolean | `disponivel='s'` |
| `created_at` | auto | `data` converti |

**Supprimés** : `tipo`, `id_util`, `compradores` (mediumtext de nicks, aberration),
`autor`, `preco_alt` (monnaie alternative).

### 3.12 `shop_orders`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `item` | M2O → `shop_items` | `id_item` |
| `buyer` | M2O → `users` | `comprador` (nick→id) |
| `price_paid` | integer | *snapshot du prix au moment de l'achat* |
| `status` | enum `pending \| delivered \| cancelled` | `status` (remappé) |
| `created_at` | auto | `data` converti |
| `delivered_at` | timestamp (nullable) | |

### 3.13 `badges`

Remplace `emblemas`. Renommer le mapping code.

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `name` | string | `nome` |
| `description` | string | `descricao` |
| `image` | string | `imagem` |
| `free` | boolean | `gratis='s'` |
| `active` | boolean | `status='ativo'` |
| `created_by` | M2O → users | `autor` |
| `created_at` | auto | `data` converti |

### 3.14 `user_badges`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `badge` | M2O → `badges` | `id_emblema` |
| `user` | M2O → `users` | `id_usuario` |
| `source` | enum `free \| earned \| bought \| generated` | `autor_tipo` |
| `granted_by` | M2O → users (nullable) | `autor` |
| `active` | boolean | `status='ativo'` |
| `created_at` | auto | `data` converti |

Unicité sur `(badge, user)`.

### 3.15 `admin_notifications`

| Champ | Type | Legacy |
|---|---|---|
| `id` | PK | `id` |
| `message` | text | `texto` |
| `severity` | enum `success \| info \| warning \| danger` | `tipo` |
| `read` | boolean default false | — (dérivé ?) |
| `author` | M2O → users | `autor` |
| `created_at` | auto | `data` converti |

### 3.16 `admin_logs`

**Conserver telle quelle** — déjà créée proprement (enum action, date-created auto).
Pas de changement à faire.

### 3.17 `habbo_nick_history`

Remplace `pseudo_changes` (0 ligne actuellement, on recrée propre).

| Champ | Type |
|---|---|
| `id` | PK |
| `user` | M2O → users (nullable si non associé) |
| `habbo_unique_id` | string |
| `hotel` | string |
| `old_nick` | string |
| `new_nick` | string |
| `detected_at` | auto |

---

## 4. Volumes à migrer

En excluant le bruit, volume réel à transférer :

| Source | Lignes | Destination |
|---|---|---|
| `usuarios` | 23 | `users` |
| `noticias` | 97 | `articles` |
| `noticias_coment` | 7 | `article_comments` |
| `noticias_coment_curtidas` | 12 | `article_comment_likes` |
| `forum_cat` | 13 | `forum_categories` |
| `forum_topicos` | 3 | `forum_topics` |
| `forum_coment` | 14 | `forum_comments` |
| `forum_coment_curtidas` | 6 | `forum_comment_likes` |
| `forum_topicos_votos` | 4 | `forum_topic_votes` |
| `usuarios_storie` | 9 | `stories` |
| `parceiros` | 3 | `sponsors` |
| `shop_itens` | 3 | `shop_items` |
| `shop_itens_mobis` | 5 | `shop_orders` |
| `emblemas` | 13 | `badges` |
| `emblemas_usuario` | 30 | `user_badges` |
| `acp_notificacoes` | 59 | `admin_notifications` |
| `admin_logs` | 1 | `admin_logs` (pas de migration) |
| **Total** | **302** | |

302 lignes. Migrable en **une requête par table**, pas besoin de batch, pas besoin de spinner.

---

## 5. Stratégie de migration

### Phase A — Préparer (cette branche `migration/directus-clean`)

1. Écrire `01-create-collections.ts` : crée les nouvelles collections Directus via `POST /collections`. Idempotent.
2. Écrire `02-migrate-data.ts` : lit les tables legacy, transforme, écrit dans les nouvelles. Avec `--dry-run`.
3. Écrire un mapping code : adapter `server/directus/*.ts` pour parler aux nouvelles collections, **pilotable par env var** (`USE_V2=true`).

### Phase B — Dry run (sur staging si possible, sinon prod read-only)

1. Lancer `01-create-collections.ts` en prod (création tables vides = non destructif).
2. Lancer `02-migrate-data.ts --dry-run` : affiche ce qui serait copié, sans écrire.
3. Vérifier le mapping nick→userId avant écriture (un log d'erreur si un nick n'a pas de match).

### Phase C — Migration réelle

1. `02-migrate-data.ts` (sans `--dry-run`) : copie des 302 lignes.
2. Activer `USE_V2=true` sur Vercel.
3. Vercel redéploie, app tape sur les nouvelles tables.
4. Observer pendant 24-48h.

### Phase D — Cleanup

Après 2 semaines de stabilité :
1. Drop des 130 tables mortes (hors `usuarios`, `noticias`, etc.)
2. Après 1 mois : drop des 15 tables legacy migrées.
3. Suppression du flag `USE_V2` (chemin unique).

### Rollback possible à chaque étape

- **Phase B** : n'écrit rien → aucun rollback nécessaire.
- **Phase C après bascule** : `USE_V2=false` → retour immédiat sur legacy.
- **Phase D après drop** : restauration depuis `habbonex_dump.sql`.

---

## 6. Points d'attention

### 6.1 Mapping nick → user_id

La majorité des tables legacy référencent l'auteur par **nick VARCHAR(80)**.
Pour passer en M2O Directus, il faut convertir chaque nick en `users.id`.

Processus :
1. Migrer d'abord `usuarios` → `users`, en conservant les IDs legacy.
2. Construire un dictionnaire `nick.toLowerCase() → id` depuis la table `users` migrée.
3. Pour chaque ligne des autres tables, résoudre `autor` → `author` via ce dict.
4. **Cas d'échec** : si le nick n'existe plus dans `users` (ancien compte supprimé), garder `author = null` + logguer pour inspection.

Risque : certains vieux commentaires forum de 2020 peuvent référencer des
utilisateurs qui n'existent plus. Sur ton volume (14 commentaires forum, 7 news), c'est gérable manuellement.

### 6.2 Conversion des dates

`data INT` (Unix timestamp en secondes) → `timestamp` ISO 8601 :
```ts
const iso = new Date(unixSeconds * 1000).toISOString()
```

### 6.3 Mots de passe bcrypt

Préserver tel quel. bcrypt est portable. Le code Next.js continuera de
valider avec `bcrypt.compare(plaintext, hash)` sans modification.

### 6.4 IDs legacy vs nouveaux IDs

**Choix : conserver les IDs legacy.**

- Dans `01-create-collections.ts`, on configure `AUTO_INCREMENT` sur chaque collection.
- Dans `02-migrate-data.ts`, on insère les lignes avec leur ID legacy explicite.
- Les liens M2O se font via ces IDs préservés → aucune casse.

Avantage : les URLs publiques (`/articles/97`, `/forum/3`) restent valides.

### 6.5 Fichiers (images)

Les `imagem` / `avatar` / `background` stockent soit :
- Une URL publique (`/uploads/...`)
- Un UUID Directus files

À la migration : garder la valeur telle quelle. Pas de re-upload. Quand le
code v2 lit un champ `cover_image` qui contient une URL, il affiche l'URL
directement ; quand c'est un UUID, il résout via `/assets/<id>`.

### 6.6 Permissions Directus

Créer **une policy v2** (`habbone_app`) avec read/create/update sur toutes
les nouvelles collections, attachée au rôle "Frontend Service". Conserver la
policy existante (read-only) pour la compat legacy pendant la transition.

---

## 7. Livrables pour la prochaine session

1. `.migration/01-create-collections.ts` — script de création
2. `.migration/02-migrate-data.ts` — script de transfert avec `--dry-run`
3. Refactor de `src/server/directus/*.ts` piloté par `USE_V2`
4. `package.json` : scripts `migrate:create`, `migrate:data`, `migrate:data:dry`

---

## 8. Décisions à valider avant de coder

Avant d'écrire `01-create-collections.ts`, tu dois me dire :

1. **OK pour les noms anglais** proposés dans la section 2 ?
2. **OK pour supprimer les champs legacy non utilisés** (liste §8.2 de l'audit) ?
3. **OK pour la stratégie side-by-side** (nouvelles tables puis drop legacy après stabilité) ?
4. **IDs : tu veux conserver les IDs legacy** (97 pour l'article 97) ou tu acceptes un re-sequencement propre à partir de 1 ?
5. **Staging** : tu peux me monter une instance Directus staging sur le VPS, ou on fait la migration directement en prod (avec rollback plan) ?
