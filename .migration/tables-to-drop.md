# Tables legacy à supprimer (phase 3)

137 tables HabboneX mortes, **70 523 lignes** au total. Aucune référence dans `src/`, aucune équivalence côté schéma v2.

**Dump disponible** : `.migration/habbonex_dump.sql` (gitignoré, contient toutes ces données).
**SQL prêt à exécuter** : `.migration/drop-dead-tables.sql`.

---

## Tables gardées (57 tables — NE PAS drop dans cette phase)

### v2 Directus (18 collections + 1 admin_logs)
`users`, `articles`, `article_categories`, `article_comments`, `article_comment_likes`, `forum_categories`, `forum_topics`, `forum_comments`, `forum_comment_likes`, `forum_topic_votes`, `stories`, `sponsors`, `shop_items`, `shop_orders`, `badges`, `user_badges`, `admin_notifications`, `habbo_nick_history`, `admin_logs`

### Legacy migrées (19 tables — à drop en phase 4 après 2-3 semaines de stabilité v2)
`usuarios`, `noticias`, `noticias_coment`, `noticias_coment_curtidas`, `noticias_cat`, `forum_cat`, `forum_topicos`, `forum_coment`, `forum_coment_curtidas`, `forum_topicos_votos`, `forum_posts`, `usuarios_storie`, `parceiros`, `shop_itens`, `shop_itens_mobis`, `emblemas`, `emblemas_usuario`, `acp_notificacoes`, `pseudo_changes`

### Directus système (36 tables `directus_*`)
Jamais touchées par le drop. Nécessaires au fonctionnement de Directus lui-même.

---

## Tables à dropper (137 tables, 70 523 lignes)

### 🔴 Plugin Security (12 tables, 64 000 lignes)
Plugin HabboneX de tracking/ban IP. Jamais exposé dans l'app Next.js.
- `psec_live-traffic` — **54 401 lignes** de logs IP + UA
- `psec_logs` — 9 542 lignes de logs sécurité
- `psec_logins` — 45 lignes
- `psec_pages-layolt` — 9 lignes
- `psec_dnsbl-databases` — 2 lignes
- `psec_file-whitelist` — 1 ligne
- `psec_bans`, `psec_bans-country`, `psec_bans-other`, `psec_bans-ranges`, `psec_ip-whitelist`, `psec_bad-words` — vides

### 🟠 Admin Control Panel HabboneX (18 tables, 3561 lignes)
Back-office de l'ancien CMS PHP. Remplacé entièrement par `/admin` côté Next.js.
- `acp_logs` (2562), `acp_midia` (803), `acp_modulos` (108), `acp_cargos` (32), `acp_paginas_visualizacoes` (28), `acp_modulos_cat` (10), `acp_usuarios` (7), `acp_nicks_trocados` (3), `acp_logs_console` (2), `acp_paginas` (2), `acp_online` (1), `acp_usuarios_alertas` (1), `acp_avisos_lido` (1), `acp_blist` (1), `acp_agenda` (0), `acp_avisos` (0), `acp_chat` (0), `acp_logins` (0)

### 🟡 Habbo Me — profils personnalisés (10 tables, 1140 lignes)
Système de widgets/fonds/autocollants sur profil. Non utilisé dans l'app.
- `hm_colantes_comprados` (477), `hm_colantes_usuario` (351), `hm_colantes` (229), `hm_fundos` (40), `hm_colantes_cat` (24), `hm_livro` (14), `hm_widgets` (5), `hm_fundos_comprados` / `hm_fundos_usuario` / `hm_widgets_usuario` (0)

### 🟡 Loteria (3 tables, 494 lignes)
Mini-jeu loterie.
- `loteria_jogos` (489), `loteria_sorteio` (4), `loteria` (1)

### 🟡 Paginas (4 tables, 305 lignes)
Système de pages statiques du CMS.
- `paginas_interacoes` (285), `paginas` (15), `paginas_cat` (5), `paginas_visualizacoes` (0)

### 🟡 Alertas (2 tables, 263 lignes)
Système d'alertes utilisateur.
- `alertas` (263), `alertas_lidos` (0)

### 🟡 Horarios (1 table, 168 lignes)
Planning horaires (radio/staff).
- `horarios` (168)

### 🟡 Timeline (4 tables, 114 lignes)
Fil Facebook-style. Non utilisé.
- `timeline_comments_likes` (112), `timeline_comments` (2), `timeline_likes` / `timeline_posts` (0)

### 🟡 Console messages (2 tables, 60 lignes)
Console messagerie Habbo.
- `console_mensagens` (60), `console_amigos` (0)

### 🟡 Awards (5 tables, 48 lignes)
Système de prix/votes.
- `awd_categorias` (47), `awd_opcoes` (1), `awd_candidatos` / `awd_indicados` / `awd_votos` (0)

### 🟡 Emblemas Habbo officiels (2 tables, 42 lignes)
Catalogue des badges Habbo (non utilisé — le projet a son propre système `emblemas`).
- `emblemas_habbo` (42), `emblemas_habbo_siglas` (0)

### 🟡 Tickets (2 tables, 40 lignes)
Support tickets HabboneX.
- `tickets_resp` (26), `tickets` (14)

### 🟡 Menu dynamique (2 tables, 38 lignes)
Menu configurable HabboneX. Remplacé par navigation React.
- `menu_sub` (33), `menu` (5)

### 🟡 Colorsorte (3 tables, 33 lignes)
Mini-jeu couleur.
- `colorsorte_cartelas` (30), `colorsorte_sorteio` (2), `colorsorte` (1)

### 🟡 Usuarios extras (8 tables, 31 lignes)
Fonctionnalités utilisateur non utilisées (online, seguidores, proibidos, alt, etc.).
- `usuarios_notificacoes` (16), `usuarios_ices` (10), `usuarios_seguidores` (4), `usuarios_proibidos` (1), `usuarios_alertas` / `usuarios_alt` / `usuarios_esq_senha` / `usuarios_on` (0)

### 🟡 Pixel art (8 tables, 30 lignes)
Galerie pixel art.
- `pixel_artes` (16), `pixel_cat` (6), `pixel_coment` (4), `pixel_atividades` (2), `pixel_coment_curtidas` (2), `pixel_grupos` / `pixel_visualizacoes` / `pixel_votos` (0)

### 🟡 Noticias extras (3 tables, 27 lignes)
Activités/interactions/votes sur articles. Remplacé par `article_comments` + `article_comment_likes`.
- `noticias_interacoes` (19), `noticias_atividades` (8), `noticias_votos` (0)

### 🟡 Eventos (4 tables, 24 lignes)
Système d'événements communautaires.
- `eventos_interacoes` (16), `eventos_coment` (4), `eventos` (3), `eventos_coment_curtidas` (1)

### 🟡 Denuncias (2 tables, 20 lignes)
Signalements utilisateur.
- `denuncias` (17), `denuncias_cat` (3)

### 🟡 Site images (1 table, 15 lignes)
Gestion images du site.
- `site_images` (15)

### 🟡 Habbo imagens (2 tables, 14 lignes)
Catalogue images Habbo.
- `habbo_imagens` (14), `habbo` (0)

### 🟡 Blogs (1 table, 5 lignes)
Blogs utilisateurs.
- `blogs` (5)

### 🟡 Slide (2 tables, 5 lignes)
Diaporama homepage HabboneX.
- `slide` (5), `slide_clicks` (0)

### 🟡 Radio (5 tables, 34 lignes)
Système de radio communautaire.
- `radio_programas` (13), `radio_likes` / `radio_presenca` (10), `radio_presenca_uso` (1), `radio_pedidos` (0)

### 🟡 Rec (2 tables, 4 lignes)
Recommandations.
- `rec_quartos` (4), `rec_grupos` (0)

### 🟡 Top music (1 table, 3 lignes)
Classement musique.
- `top_music` (3)

### 🟡 Campanha / Config / Destaques / Forum_interacoes (4 tables, 5 lignes)
Divers.
- `campanha` (1), `config` (1), `destaques` (1), `forum_interacoes` (2)

### 🟡 Quartos (7 tables, 0 ligne)
Annuaire chambres Habbo. Entièrement vide.
- `quartos`, `quartos_atividades`, `quartos_cat`, `quartos_coment`, `quartos_coment_curtidas`, `quartos_visualizacoes`, `quartos_votos`

### 🟡 Autres tables 100% vides
- `ban_ip`, `codigos_emblemas`, `codigos_moedas`, `codigos_moedas_alt`, `itens_gratis`, `mensagens`, `mensagens_favoritado`, `pontos_locutores`, `shoutbox`, `system_logs`, `valores`, `valores_cat`, `valores_historico`, `videos`, `videos_visualizacoes`, `videos_votos`, `forum_topicos_visualizacoes`

---

## Comment exécuter

```bash
# Option 1 — via MySQL client directement (VPS)
mysql -h 172.17.0.1 -u habbonex_dbuser -p habbonex_main < .migration/drop-dead-tables.sql

# Option 2 — copie le fichier .sql sur le VPS puis lance localement là-bas
scp .migration/drop-dead-tables.sql root@37.59.101.4:/tmp/
ssh root@37.59.101.4 "mysql -h 172.17.0.1 -u habbonex_dbuser -p habbonex_main < /tmp/drop-dead-tables.sql"
```

**Temps d'exécution attendu** : < 10 secondes.
**Irréversible** : la source pour restauration est `habbonex_dump.sql` (22 MB, local).
