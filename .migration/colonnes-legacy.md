# Arbitrage des colonnes legacy à garder / supprimer

Méthode : grep de chaque colonne dans `src/` (ciblé sur les services concernés pour éviter les faux positifs). Si une colonne n'est référencée **nulle part** dans le code applicatif, elle est proposée à la suppression.

**Ton rôle** : valider chaque proposition avant que j'écrive les scripts.

---

## `usuarios` → `users`

### ✅ À garder (utilisé quelque part dans le code)

| Colonne | v2 | Usage |
|---|---|---|
| `id` | `id` | PK, partout |
| `nick` | `nick` | 328 refs |
| `senha` | `password` | 12 refs (auth) |
| `email` | `email` | 48 refs |
| `avatar` | `avatar_url` | 5 refs user services |
| `missao` | `mission` | 7 refs |
| `moedas` | `coins` | 5 refs |
| `ativado` | `active` (bool) | 24 refs |
| `banido` | `banned` (bool) | 20 refs |
| `data_criacao` | `created_at` | 8 refs |
| `habbo_unique_id` | `habbo_unique_id` | 13 refs |
| `habbo_hotel` | `habbo_hotel` | 9 refs |
| `habbo_verification_status` | `habbo_verification_status` | 5 refs |
| `habbo_verification_code` | `habbo_verification_code` | 15 refs |
| `habbo_verification_expires_at` | `habbo_verification_expires_at` | 13 refs |
| `habbo_verified_at` | `habbo_verified_at` | 5 refs |
| `directus_role_id` | `role` (M2O → `directus_roles`) | 20 refs |
| `status` | *supprimé côté v2* | voir ci-dessous |
| `role` | *supprimé côté v2* | voir ci-dessous |
| `background` | `background_url` | jamais utilisé dans les services, **mais affiché sur les profils** (vérifie) |

### 🗑️ À supprimer (0 référence dans le code, uniquement legacy HabboneX)

| Colonne | Pourquoi |
|---|---|
| `facebook_id` | jamais utilisé |
| `nome` | jamais utilisé |
| `assinatura` | signature de CMS, jamais affichée |
| `moedas_alt` | monnaie alternative, jamais utilisée |
| `pontos` | gamification HabboneX |
| `tarja` | décoratif CMS |
| `placar` | scoring CMS |
| `facebook`, `twitter`, `instagram`, `discord` | liens sociaux jamais affichés dans l'app |
| `pontos_campanha`, `pontos_campanha_ac_comentario`, `equipe_campanha` | système campagne HabboneX |
| `quartos_pontos` | lié à la fonctionnalité "rooms" absente |
| `vip`, `vip_expira` | système VIP non utilisé |
| `pixel_grupo` | lié à `pixel_*` non utilisé |
| `radio_presencas` | lié à `radio_*` non utilisé |
| `ativado_data` | jamais utilisé |
| `acesso_data`, `acesso_ip`, `acesso_ua`, `acesso_gl` | tracking login legacy, **à garder en v2 sous forme simplifiée ?** (voir question) |

### 🤔 À arbitrer

| Colonne | Question |
|---|---|
| `status` (`ativo \| inativo`) | **dupliqué avec `ativado`** → je supprime, on dérive de `banned`/`active` |
| `role` (string) | **dupliqué avec `directus_role_id`** → je supprime, vraie relation M2O |
| `ban_motivo`, `ban_termino`, `ban_autor` | **0 refs code** MAIS utiles pour un admin panel "voir pourquoi un user est banni". Tu les gardes ? |
| `acesso_data/ip/ua/gl` | **0 refs** mais utile pour audit. Tu les gardes sous forme `last_login_*` ? |
| `background` | **0 refs services** mais potentiellement affiché sur `/profile/[nick]`. Je vérifie ? |

---

## `noticias` → `articles`

### ✅ À garder

| Colonne | v2 | Usage |
|---|---|---|
| `id`, `titulo`, `descricao`, `imagem`, `noticia`, `autor`, `data`, `status` | `id`, `title`, `summary`, `cover_image`, `body`, `author` (M2O), `published_at`, `status` | tous utilisés |

### 🗑️ À supprimer (0 refs)

- `tags` — jamais utilisé
- `cat_id` — **0 refs** (les articles n'ont pas de catégorie côté app)
- `comentarios` (flag on/off) — jamais utilisé, les comments sont toujours activés
- `fixo` (pinned) — jamais utilisé côté app
- `views` — compteur de vues jamais incrémenté
- `views_ips` — aberration (liste d'IPs en mediumtext)
- `evento`, `evento_horario`, `evento_premio`, `evento_organizadores` — système d'événements HabboneX
- `blog_id` — lié à table `blogs` non utilisée
- `emblema` — champ décoratif legacy

### 🤔 À arbitrer

| Colonne | Question |
|---|---|
| `cat_id` / catégories | **0 refs dans `src/`** donc j'allais supprimer. Mais `noticias_cat` a 34 lignes. Tu veux **garder** les catégories d'articles en v2 (affichage futur) ou **drop** ? |
| `fixo` | Idem — feature "article épinglé" existe en BDD mais pas côté front. Tu veux la garder disponible ? |
| `views` | Jamais incrémenté → drop propre. OK ? |

---

## `forum_topicos` → `forum_topics`

### ✅ À garder

| Colonne | v2 | Usage |
|---|---|---|
| `id`, `titulo`, `conteudo`, `imagem`, `cat_id`, `fechado`, `fixo`, `views`, `status`, `autor`, `data` | `id`, `title`, `body`, `cover_image`, `category` (M2O), `locked`, `pinned`, `views`, `status`, `author`, `created_at` | tous utilisés |

### 🗑️ À supprimer (0 refs)

- `editado`, `editado_autor`, `editado_data` — tracking édition jamais utilisé
- `fechado_motivo`, `fechado_autor`, `fechado_data` — détails verrou non affichés
- `moderado`, `mod_autor`, `mod_data` — duplique avec `status`
- `views_ip` — idem aberration
- `status_autor`, `status_data` — 0 refs
- `data_ativo` — 0 refs

### 🤔 À arbitrer

- `fechado_motivo` (raison du verrouillage) — **0 refs** mais pourrait être utile côté admin. Tu gardes ?
- `editado_data` — utile pour afficher "édité le..." en futur. Tu gardes ?

---

## `forum_coment` / `noticias_coment` → `forum_comments` / `article_comments`

Simples, pas grand-chose à supprimer.

| Legacy | v2 | Garde ? |
|---|---|---|
| `id`, `id_forum`/`id_noticia`, `comentario`, `autor`, `data`, `status` | tous | ✅ |
| `curtida` (forum_coment) | `likes_count` | ✅ on garde le compteur dénormalisé |

---

## `shop_itens` → `shop_items`

### ✅ À garder

| Colonne | v2 | Usage |
|---|---|---|
| `id`, `imagem`, `nome`, `preco_moedas`, `qtd_disponivel`, `disponivel`, `data`, `status` | `id`, `image`, `name`, `price_coins`, `stock`, `active`, `created_at`, `status` | tous utilisés |

### 🗑️ À supprimer

- `tipo` (2 refs mais valeur toujours 1 — défaut) — drop
- `id_util` — toujours 1
- `preco_alt` (prix monnaie alternative) — drop avec `moedas_alt`
- `gratis` — jamais utilisé
- `qtd_comprado` — compteur, on recalcule depuis `shop_orders`
- `compradores` (mediumtext liste de nicks) — remplacé par `shop_orders`
- `autor` — métadonnée admin inutile

---

## `shop_itens_mobis` → `shop_orders`

### ✅ À garder

| Colonne | v2 |
|---|---|
| `id`, `id_item`, `comprador`, `data`, `status` | `id`, `item` (M2O), `buyer` (M2O), `created_at`, `status` |

### 🗑️ À supprimer

- `ip` (IP de l'acheteur) — tracking non affiché, RGPD-unfriendly

---

## `parceiros` → `sponsors`

### ✅ À garder (tout)

| Colonne | v2 |
|---|---|
| `id`, `nome`, `link`, `imagem`, `status` | `id`, `name`, `link`, `image`, `active` |

### 🗑️ À supprimer

- `autor` — métadonnée admin (ou garder en `created_by` si tu veux)
- `data` → `created_at` (auto)

---

## `emblemas` → `badges` / `emblemas_usuario` → `user_badges`

### ✅ À garder (tout)

Tous les champs de `emblemas` sont utilisés (`nome`, `descricao`, `imagem`, `gratis`, `status`).

Tous les champs de `emblemas_usuario` sont utilisés (`id_emblema`, `id_usuario`, `autor_tipo`, `autor`, `data`, `status`).

### 🗑️ À supprimer

- `emblemas.autor` — métadonnée admin

---

## `usuarios_storie` → `stories`

### ✅ À garder (tout)

`id`, `autor`, `image`, `data`, `status`, `published_at` — tous utilisés.

---

## `acp_notificacoes` → `admin_notifications`

### ✅ À garder (tout)

`id`, `texto`, `tipo`, `autor`, `data`, `status` — tous utilisés.

### Ajout v2

- `read` (bool) — nouveau, pour que l'admin puisse marquer comme lu

---

## `admin_logs`

**Inchangé.** Déjà créé proprement, date_created auto. Pas de migration.

---

## Résumé des points nécessitant **ta décision explicite**

### ➡️ Questions binaires (oui/non)

1. **`usuarios.background`** — tu confirmes qu'on garde le champ `background_url` dans v2 `users` ? (utile si affiché sur profil)
2. **`usuarios.ban_motivo/ban_termino/ban_autor`** — tu les gardes (utile panel admin "voir pourquoi ce user est banni") ou tu drop ?
3. **`usuarios.acesso_*`** (last login ip/ua/gl) — tu gardes en `last_login_*` (audit) ou tu drop ?
4. **`noticias.cat_id` / `noticias_cat`** — tu gardes les catégories d'articles en v2 (pour affichage futur) ou drop ?
5. **`noticias.fixo`** — garder feature "article épinglé" ?
6. **`forum_topicos.fechado_motivo`** — garder ?
7. **`forum_topicos.editado_data`** — garder (pour afficher "édité le...") ?
8. **`parceiros.autor` / `emblemas.autor`** — garder sous forme de relation `created_by` M2O → users ?

### ➡️ Défaut si tu ne réponds pas

Si tu ne te prononces pas, je prends la décision la plus **conservative** (garder) pour tous les points "à arbitrer". Ça ne coûte pas grand-chose en v2 d'avoir quelques champs inutilisés, et c'est réversible.

### ➡️ Point non-négociable

- **`usuarios.senha` → `users.password`** : obligatoire, on préserve les hashes bcrypt tels quels.
- **IDs conservés** : confirmé par toi.
- **`status`/`role` sur `usuarios`** : doublons, je supprime.
- **Toutes les colonnes HabboneX folklore** (`vip`, `pontos_campanha`, `pixel_grupo`, `radio_presencas`, etc.) : je supprime sans demander, jamais référencées nulle part.
