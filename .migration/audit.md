# Audit BDD legacy — `habbonex_main`

Base : **MySQL 8.0.45** sur le VPS (container Directus v11.11 y est connecté).
Dump analysé : `.migration/habbonex_dump.sql` (22 MB, 5 643 lignes SQL).
Date : 2026-04-23.

---

## 1. Vue d'ensemble

| Catégorie | Tables | Avec données | Total lignes |
|---|---|---|---|
| **Legacy HabboneX** | 147 | 87 | ~78 500 |
| **Directus système** | 36 | 18 | ~2 400 |
| **Total** | 183 | 105 | ~80 900 |

Sur les 147 tables legacy :
- **60 sont vides** → à ignorer purement et simplement
- **87 contiennent des données** dont la grande majorité est du **bruit** (logs, cache, moderation, fonctionnalités CMS non utilisées par l'app Next.js)
- **~18 tables seulement** sont référencées dans le code Next.js

### Les 2 tables qui font du poids

| Table | Lignes | Usage dans l'app | Action migration |
|---|---|---|---|
| `psec_live-traffic` | 54 401 | aucun | **drop** |
| `psec_logs` | 9 542 | aucun | **drop** |

À elles seules, ces deux tables font ~80% des lignes. Elles viennent d'un plugin "PSec" (HabboneX security) non utilisé.

---

## 2. Triggers, procédures, events

**Zéro.** J'ai grep le dump : section "Dumping routines" vide, section "Dumping events" vide, aucun `CREATE TRIGGER`.

Le bug `CONTAINS_NULL_VALUES` rencontré en prod (ban/unban) **n'était pas un trigger** : c'est la colonne `usuarios.status` définie comme `ENUM('ativo', 'inativo')`. Le code envoyait `'suspended'` qui n'est pas dans l'enum → MySQL rejette, Directus masque l'erreur.

**Conséquence** : la migration n'a pas à se soucier de logique cachée côté BDD. C'est 100% déclaratif.

---

## 3. Foreign keys

**42 FK au total, toutes dans les tables `directus_*`** (ajoutées automatiquement par Directus sur ses propres tables).

**Aucune FK dans les tables legacy HabboneX.** Les relations sont implicites via convention de nommage (`id_usuario`, `id_forum`, `autor`). Héritage classique d'un vieux schéma PHP/MySQL MyISAM.

**Conséquence** : on peut réorganiser/renommer les tables sans casser d'intégrité référentielle imposée par la BDD.

---

## 4. Tables utilisées par le code Next.js

Grep exhaustif dans `src/` :

### Tables lues ET écrites

| Table legacy | Rôle | Lignes | Service code |
|---|---|---|---|
| `usuarios` | Comptes utilisateurs | 23 | `legacy-users.ts`, `admin-users.ts`, `users.ts` |
| `noticias` | Articles | 97 | `news.ts` |
| `noticias_coment` | Commentaires articles | 7 | `news.ts` |
| `forum_topicos` | Sujets forum | 3 | `forum.ts` |
| `forum_posts` | Messages forum | 0 | `forum.ts` |
| `forum_coment` | Commentaires sujets | 14 | `forum.ts` |
| `forum_cat` | Catégories forum | 13 | `forum.ts` |
| `usuarios_storie` | Stories | 9 | `stories.ts` |
| `parceiros` | Partenaires/sponsors | 3 | `pub` API |
| `shop_itens` | Articles boutique | 3 | `shop.ts` |
| `shop_itens_mobis` | Commandes boutique | 5 | `shop.ts` |
| `acp_notificacoes` | Notifs admin | 59 | `shop.ts` |
| `emblemas` | Badges | 13 | `badges.ts` |
| `emblemas_usuario` | Attribution badges | 30 | `badges.ts` |
| `admin_logs` | Audit trail | 1 | `admin-logs.ts` |

### Tables avec curtidas/votos (likes)

| Table | Lignes | Usage |
|---|---|---|
| `forum_coment_curtidas` | 6 | likes sur commentaires forum |
| `forum_topicos_votos` | 4 | votes sujets |
| `noticias_coment_curtidas` | 12 | likes commentaires articles |

### Tables Directus natives

| Table | Lignes | Usage |
|---|---|---|
| `directus_users` | 4 | comptes admin Directus |
| `directus_roles` | 10 | rôles |
| `directus_policies` | 6 | permissions |
| `directus_files` | 70 | assets images |

### Tables avec données mais **non utilisées** dans `src/`

Beaucoup. Exemples : `acp_logs` (2562), `acp_midia` (803), `loteria_jogos` (489), `hm_colantes*` (~1100), `alertas` (263), `timeline_comments_likes` (112), `awd_*` (gagnants/indications), `blogs`, `denuncias`, `menu`, `pixel_*`, `quartos_*`, `radio_*`, `tickets*`, `console_mensagens`, etc.

Ce sont des **fonctionnalités du CMS HabboneX qui ne tournent plus** : forum de mods, système de tickets, radio, loterie, galerie pixel-art, timeline style Facebook, sondages, etc.

---

## 5. Patterns récurrents dans le schéma legacy

Toutes les tables HabboneX suivent quasi-systématiquement :

- **IDs** : `id INT AUTO_INCREMENT PRIMARY KEY`
- **Dates** : `data INT` = timestamp Unix (secondes). Pas de `DATETIME`.
- **Auteur** : `autor VARCHAR(80)` = **nick** (pas ID). Relation "par nom". Très fragile si quelqu'un change de pseudo.
- **Statut** : `status ENUM('ativo', 'inativo')`. Certaines tables ajoutent `'rascunho'`, `'revisao'`.
- **Booléens** : `ENUM('s', 'n')` — pas de `TINYINT(1)`, pas de `BOOLEAN`.
- **Textes longs** : `mediumtext` ou `longtext`.
- **Collations** : mélange `utf8mb4_unicode_ci` (majorité) + `latin1` (4 tables legacy : `parceiros`, `emblemas`, `emblemas_usuario`, `acp_notificacoes`).

### Champs ajoutés récemment (couche moderne)

Sur `usuarios` on voit des colonnes **récentes** ajoutées après le bootstrap initial :

```
habbo_unique_id, habbo_hotel, habbo_verification_status,
habbo_verification_code, habbo_verification_expires_at,
habbo_verified_at, directus_role_id
```

Ce sont les colonnes ajoutées quand ton équipe a greffé Next.js + NextAuth + Directus par-dessus.

**Elles sont propres** (types modernes, noms anglais). C'est une bonne base pour le schéma v2.

---

## 6. Incohérences de modèle

### 6.1 Trois conventions de date qui cohabitent

- `data INT` (timestamp Unix secondes) : la majorité
- `published_at DATETIME` : ajouté récemment sur `usuarios_storie`
- `habbo_verified_at DATETIME` : ajouté récemment sur `usuarios`
- `admin_logs.date_created DATETIME` : la nouvelle collection

### 6.2 Deux façons de référencer un utilisateur

- Par **nick** (`autor VARCHAR(80)`) : legacy — 90% des tables
- Par **id** (`id_usuario INT`) : moderne — `emblemas_usuario`

### 6.3 Mots de passe

`usuarios.senha VARCHAR(255)`. Le code détecte via `isBcrypt()` et upgrade au login. Donc cohabitation de :
- Hashes bcrypt modernes
- Vieux hashes HabboneX (MD5 + salt probable, à vérifier si on migre)

### 6.4 Ambiguïté badges / emblemas

Le code `src/server/directus/badges.ts` tape sur la table **`emblemas`** — pas `badges`. L'audit admin avait buggé plus tôt parce que le service Directus cache basé sur "`badges`" renvoyait 403. **Il n'y a pas de table `badges`**.

---

## 7. Ce qui est utilisé en production (au sens strict)

En croisant :
- volumes > 0
- référencé dans `src/`
- feature actuellement accessible depuis `habbone.fr`

J'obtiens **15 tables actives** :

```
usuarios (23)         → users + profils
noticias (97)         → actualités
noticias_coment (7)   → commentaires actus
noticias_coment_curtidas (12) → likes actus
forum_topicos (3)     → sujets forum
forum_coment (14)     → commentaires forum
forum_coment_curtidas (6) → likes commentaires
forum_topicos_votos (4) → votes sujets
forum_cat (13)        → catégories forum
parceiros (3)         → sponsors homepage
shop_itens (3)        → articles boutique
shop_itens_mobis (5)  → commandes
usuarios_storie (9)   → stories
emblemas (13)         → badges attribuables
emblemas_usuario (30) → badges attribués
acp_notificacoes (59) → notifications admin
admin_logs (1)        → audit trail (nouveau)
```

Volume total utile : **~300 lignes**. Tout le reste est du bruit.

---

## 8. Ce qui doit partir

### 8.1 Tables legacy à dropper purement et simplement

Les 60 tables vides + toutes les tables non utilisées avec données anciennes :
- `acp_*` (sauf `acp_notificacoes`) → logs/backend du CMS admin HabboneX. 14 tables.
- `awd_*` → système de prix Awards. 5 tables.
- `psec_*` → PluginSecurity. 12 tables.
- `hm_*` → "habbo-me" widgets/fonds/autocollants. 11 tables.
- `pixel_*` → galerie pixel art. 8 tables.
- `quartos_*` → liste de rooms. 7 tables.
- `radio_*` → radio. 5 tables.
- `loteria_*` → loterie. 3 tables.
- `paginas_*`, `menu*`, `blogs`, `eventos_*`, `timeline_*`, `tickets*`, `denuncias*`, `campanha`, `colorsorte*`, `alertas*`, `slide*`, `top_music`, `destaques`, `horarios`, `valores*`, `videos*`, `ban_ip`, `codigos_*`, `system_logs`, `site_images`, `habbo*`, `emblemas_habbo*`, `recomendacoes_*`, `console_*`, `mensagens*`, `usuarios_ices`, `usuarios_alt`, `shoutbox` etc. → fonctionnalités non utilisées.

Soit **~130 tables à dropper**.

### 8.2 Colonnes à retirer des tables conservées

Sur `usuarios` (exemples) :
- `facebook_id`, `facebook`, `twitter`, `instagram`, `discord` → jamais utilisés par l'app Next.js
- `assinatura`, `placar`, `tarja` → décoratif CMS
- `moedas_alt`, `pontos_campanha*`, `equipe_campanha`, `quartos_pontos`, `radio_presencas` → gamification inutilisée
- `vip`, `vip_expira` → fonctionnalité VIP inutilisée
- `acesso_ip`, `acesso_ua`, `acesso_gl` → tracking login (ok à garder pour audit)
- `ban_motivo`, `ban_termino`, `ban_autor` → à conserver (utile pour le panel admin)

Sur `noticias` : `tags` (jamais utilisé), `evento_*` (5 colonnes), `emblema`, `views_ips` (liste d'IPs en mediumtext, invraisemblable)

---

## 9. Conclusion de l'audit

**Bonne nouvelle majeure** : le schéma legacy est **facile à migrer**. Pas de triggers, pas de FK, pas de procédure stockée. C'est du pur déclaratif.

**Mauvaise nouvelle modeste** : le schéma est **profondément incohérent** :
- Noms portugais + ajouts anglais
- 3 formats de date
- 2 modèles de référence utilisateur (nick vs id)
- ENUMs non uniformes
- `latin1` mélangé à `utf8mb4`
- ~130 tables mortes qui encombrent

**Opportunité** : vu le faible volume réel (~300 lignes signifiantes), on peut se permettre une **refonte complète** sans risque. C'est même plus propre de tout recréer que d'essayer de conserver l'existant.

---

## 10. Suite : que proposer dans `schema-v2.md`

Voir `schema-v2.md` pour :
- Le nouveau schéma propre en anglais
- Le mapping legacy → v2 champ par champ
- La stratégie de migration des données (préserver IDs, liens nick↔id, hashes bcrypt)
- Le plan de bascule (tables side-by-side + switch progressif)
