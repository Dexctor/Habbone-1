# Plan réparation DNS — habbone.fr chez OVH

> 🔴 Le site est DOWN car les serveurs DNS de habbone.fr (chez ni-host) sont
> coupés. Le VPS + PocketBase + données sont INTACTS. Il faut juste refaire
> pointer le DNS vers OVH. Nécessite les accès OVH du client (en attente).
>
> Domaine `habbone.fr` : registrar = OVH (confirmé). Nameservers actuels =
> ni-host (morts). Objectif : passer le DNS à OVH + recréer les enregistrements.

## Étape 1 — Se connecter à OVH
- https://www.ovh.com/manager/ → connexion avec les identifiants client
- Section **Web Cloud** → **Noms de domaine** → cliquer **habbone.fr**

## Étape 2 — Basculer sur les serveurs DNS OVH
- Onglet **Serveurs DNS** (Nameservers / DNS servers)
- Probablement : actuellement `magic.ni-host.com` / `poney.ni-host.com`
- Cliquer **Modifier les serveurs DNS** → choisir **"Utiliser les serveurs DNS OVHcloud"**
  (option qui remet les NS par défaut OVH type `dns200.anycast.me` / `ns200.anycast.me`)
- Valider.

⚠️ Dès qu'on bascule sur OVH, OVH active une **zone DNS** pour le domaine. Il
faut s'assurer qu'elle contient les bons enregistrements (étape 3). La
propagation prend de quelques minutes à 24-48h, mais comme l'ancien DNS est
DÉJÀ mort, on ne casse rien de plus — on ne fait que réparer.

## Étape 3 — Recréer/vérifier les enregistrements (onglet "Zone DNS")
Vérifier que ces entrées existent (les créer/corriger sinon) :

| Sous-domaine | Type | Cible | Rôle |
|---|---|---|---|
| **pb**  | A | **37.59.101.4** | PocketBase (VPS) ← CRITIQUE pour le site |
| **api** | A | **37.59.101.4** | Directus (VPS, secours) |
| **@** (habbone.fr) | → Vercel | voir étape 4 | nouveau front |
| **www** | → Vercel | voir étape 4 | nouveau front |

- Pas d'emails @habbone.fr à conserver (confirmé) → ignorer MX/webmail/cpanel/ftp/mail.
- L'ancien `46.105.171.70` (ni-host) ne doit plus être utilisé (serveur mort).

## Étape 4 — Pointer habbone.fr vers Vercel
Dans Vercel (projet `habbone`) → Settings → **Domains** → ajouter `habbone.fr`
et `www.habbone.fr`. Vercel donnera les valeurs DNS à mettre :
- soit un **A record** `@ → 76.76.21.21` (IP Vercel) + CNAME `www → cname.vercel-dns.com`
- soit les valeurs exactes affichées par Vercel (suivre ce que Vercel indique).
Mettre ces valeurs dans la zone DNS OVH (étape 3).

> ⚠️ Pour l'instant la prod (habbone.fr) est sur la branche `main` (Directus).
> Si on pointe habbone.fr vers Vercel AVANT d'avoir basculé la prod sur
> PocketBase, le domaine affichera la prod actuelle (Directus) — qui marche
> encore via api.habbone.fr (sur le VPS). La bascule prod PocketBase
> (merge dans main + vars POCKETBASE_* en Production) est une étape séparée.

## Étape 5 — Vérifier la propagation
Depuis n'importe quelle machine :
```
nslookup pb.habbone.fr        # doit donner 37.59.101.4
curl https://pb.habbone.fr/api/health   # doit donner {"message":"API is healthy."...}
```
Quand pb.habbone.fr répond → le site PocketBase remarche.

## Étape 6 (APRÈS DNS OK) — Rapatrier les 283 images depuis le backup
On a le backup ni-host complet (les 822 images extraites dans le scratchpad).
Dès que pb.habbone.fr répond, lancer :
```
node --env-file=.env.vps --import tsx scripts/migration-pb/13-rehost-from-backup.ts --dry-run
node --env-file=.env.vps --import tsx scripts/migration-pb/13-rehost-from-backup.ts
```
→ récupère les images de contenu manquantes depuis le backup local, les uploade
sur PocketBase, réécrit les liens. Puis redéployer Vercel.

## Contournement temporaire (si besoin de joindre PB AVANT le DNS)
Ajouter dans le fichier hosts Windows (PowerShell admin) :
```
Add-Content -Path "$env:windir\System32\drivers\etc\hosts" -Value "`n37.59.101.4 pb.habbone.fr"
```
⚠️ À RETIRER une fois le vrai DNS réparé (sinon l'IP reste figée localement).
