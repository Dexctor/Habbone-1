# Checklist de coupure Directus / VPS

Cette checklist sert a valider que la preview Supabase peut devenir la production sans dependance active a Directus.

## 1. Geler les ecritures

- Fermer temporairement les actions d'administration qui ecrivent dans Directus.
- Eviter les nouvelles stories, articles, commandes boutique et likes pendant la synchronisation finale.
- Garder le VPS allume jusqu'a validation post-deploiement.

## 2. Synchroniser le delta final

Tables a comparer entre MySQL VPS et Supabase avant coupure :

- `users`
- `articles`
- `article_comments`
- `article_comment_likes`
- `forum_topics`
- `forum_comments`
- `forum_comment_likes`
- `forum_topic_votes`
- `shop_items`
- `shop_orders`
- `stories`
- `badges`
- `user_badges`
- `sponsors`
- `pseudo_changes`

Points deja identifies pendant l'audit :

- Le VPS avait une story plus recente que Supabase (`stories.id = 51`).
- Le VPS avait deux commandes boutique de plus que Supabase.
- Certains commentaires forum orphelins ont ete archives/supprimes dans Supabase. C'est acceptable seulement si l'historique visible n'est pas requis.

## 3. Synchroniser les medias

- Copier les derniers fichiers Directus dans le bucket Supabase `directus-uploads`.
- Verifier les lignes qui pointent encore vers `/uploads/...`.
- Ne couper `habbone.fr/uploads` que lorsque ces fichiers existent aussi dans Supabase Storage.

## 4. Lancer les controles Supabase

Depuis la racine du repo :

```powershell
docker run --rm `
  -v "${PWD}:/repo" `
  postgres:17 `
  psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/004-cutover-checks.sql
```

Les compteurs doivent correspondre au dernier export voulu. Les references `/uploads/...` restantes doivent etre traitees avant fermeture du VPS.

Si les controles remontent des references media sous forme d'UUID Directus sans extension, lancer ensuite :

```powershell
docker run --rm `
  -v "${PWD}:/repo" `
  postgres:17 `
  psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /repo/scripts/supabase/005-normalize-media-paths.sql
```

Ce script remplace les UUID nus par le nom d'objet present dans Supabase Storage (`uuid.png`, `uuid.jpg`, etc.).

## 5. Variables Vercel attendues

- `DATA_BACKEND=supabase`
- `SUPABASE_DB_URL`
- `SUPABASE_DB_SCHEMA=habbonex_main`
- `SUPABASE_DB_POOL_MAX`
- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOADS_BUCKET=directus-uploads`
- `NEXT_PUBLIC_MEDIA_BACKEND=supabase`
- `NEXT_PUBLIC_SUPABASE_UPLOADS_BASE`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `REDIS_URL` si le cache Redis reste utilise

## 6. Tests fonctionnels obligatoires

- Connexion et inscription.
- Creation d'article avec image.
- Creation de story avec image.
- Like commentaire article puis reload.
- Like commentaire forum puis reload.
- Achat boutique et creation commande.
- Changement pseudo Habbo.
- Panel admin : roles, utilisateurs, ban, logs, notifications, pubs, theme.
- Pages publiques : accueil, news, forum, boutique, badges, team, profil.

## 7. Apres mise en production

- Surveiller les logs Vercel pour les `500`.
- Chercher les requetes restantes vers `api.habbone.fr` et `/uploads`.
- Garder le VPS en lecture seule quelques jours.
- Couper le VPS seulement quand aucune dependance restante n'est observee.
