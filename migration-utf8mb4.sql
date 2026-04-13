-- ============================================================
-- Migration latin1 -> utf8mb4 pour Habbone
-- A executer dans phpMyAdmin > onglet SQL
-- Base: habbonex_main
-- ============================================================

-- 1. Changer le charset par defaut de la base
ALTER DATABASE `habbonex_main` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Tables utilisees activement par le site Next.js
ALTER TABLE `usuarios` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `noticias` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `noticias_coment` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `noticias_coment_curtidas` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_cat` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_topicos` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_posts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_coment` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_coment_curtidas` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_interacoes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `forum_topicos_votos` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `admin_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2b. Tables boutique (shop)
ALTER TABLE `shop_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `shop_orders` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `admin_notifications` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reparer les donnees deja corrompues (double-encoded latin1→utf8)
-- Trône Doré stocké en latin1 apparait comme "TrÃ´ne DorÃ©" en utf8
UPDATE `shop_items`
SET nome = CONVERT(CAST(CONVERT(nome USING latin1) AS BINARY) USING utf8mb4)
WHERE nome LIKE '%Ã%' OR nome LIKE '%Ã©%' OR nome LIKE '%Ã´%' OR nome LIKE '%Ã¨%';

UPDATE `shop_items`
SET descricao = CONVERT(CAST(CONVERT(descricao USING latin1) AS BINARY) USING utf8mb4)
WHERE descricao IS NOT NULL AND (descricao LIKE '%Ã%' OR descricao LIKE '%Ã©%');

-- 3. Tables secondaires qui pourraient etre utilisees plus tard
ALTER TABLE `emblemas` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `emblemas_habbo` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `parceiros` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `config` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- Verification : cette requete doit retourner 0 tables en latin1
-- parmi celles qu'on utilise
-- ============================================================
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'habbonex_main'
  AND TABLE_NAME IN (
    'usuarios', 'noticias', 'noticias_coment', 'noticias_coment_curtidas',
    'forum_cat', 'forum_topicos', 'forum_posts', 'forum_coment',
    'forum_coment_curtidas', 'forum_interacoes', 'forum_topicos_votos',
    'admin_logs', 'shop_items', 'shop_orders', 'admin_notifications'
  )
ORDER BY TABLE_NAME;
