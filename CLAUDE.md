# Mémoire Projet Habbone

## Architecture du projet
- **Framework** : Next.js 15.5.9 (App Router) + React 19.1.0 + TypeScript
- **Styling** : Tailwind CSS v4.1.12 (classes inline, PAS de CSS Modules)
- **Auth** : next-auth v4 (credentials, bcryptjs, JWT sessions)
- **CMS** : Directus SDK v20.0.3 (backend headless)
- **Animations** : Framer Motion v12.23.12
- **UI** : 31 composants Radix UI dans `src/components/ui/`
- **Icons** : lucide-react + Material Icons
- **Font** : Montserrat (via `--font-sans`)
- **Mode** : Dark theme par défaut (`<html className="dark">`)
- **Path alias** : `@/*` → `./src/*`
- **Repo** : https://github.com/Dexctor/Habbone-1.git (branche `main`)

## Tokens de couleur (Design System)
```
--bg-400: #303060      --bg-500: #2C2C4F      --bg-600: #25254D
--bg-700: #272746      --bg-800: #1F1F3E      --bg-900: #141433
--yellow-300: #FFD722  --yellow-500: #FFC800
--green-300: #49E400   --green-500: #0FD52F
--blue-300: #25B1FF    --blue-500: #2596FF    --blue-700: #2976E8
--red-300: #FF4B6C     --red-500: #F92330
--text-100: #fff       --text-400: #DDDDDD    --text-500: #BEBECE
--shadow-100: rgba(255,255,255,.05)
```

## Structure des dossiers clés
```
src/
├── app/                     # Routes (App Router file-based)
│   ├── boutique/page.tsx    # Page boutique (refaite session courante)
│   ├── news/                # Articles (page.tsx serveur + news-page-client.tsx client)
│   ├── forum/               # Forum
│   ├── badges/              # Badges
│   ├── mobis/               # Recherche mobis
│   ├── imager/              # Générateur avatar
│   ├── pseudohabbo/         # Changement pseudo
│   ├── partenaires/         # Partenaires
│   ├── team/                # Equipe staff
│   ├── login/               # Connexion
│   ├── register/            # Inscription
│   ├── profile/             # Profil + /profile/admin
│   ├── settings/            # Paramètres
│   ├── contact/             # Contact
│   └── layout.tsx           # Layout racine
├── components/
│   ├── layout/
│   │   ├── header-tw.tsx           # Header principal (TopBar + Banner + UserBar)
│   │   ├── header/
│   │   │   ├── navigation.ts       # Données du menu nav (modifié cette session)
│   │   │   ├── TopBar.tsx           # Barre nav + dropdowns (Framer Motion)
│   │   │   ├── Banner.tsx           # Logo/bannière
│   │   │   ├── UserBarLeft.tsx      # Login/user info
│   │   │   ├── BadgesSlider.tsx     # Carousel badges
│   │   │   ├── MobileMenu.tsx       # Menu mobile hamburger
│   │   │   ├── LoginModal.tsx       # Modal connexion
│   │   │   └── RegisterModal.tsx    # Modal inscription
│   │   ├── footer.tsx              # Footer multi-colonnes
│   │   └── app-shell.tsx           # Shell layout (topbar + main + footer)
│   ├── home/                       # Composants page accueil
│   ├── admin/                      # Composants admin (9 fichiers)
│   └── ui/                         # 31 composants Radix UI
├── lib/                            # Utilitaires (media-url, text-utils, habbo-imaging, etc.)
├── server/
│   └── directus/                   # Services Directus (users, news, badges, forum, etc.)
├── styles/
│   └── header.css                  # CSS spécifique header
└── auth.ts                         # Config NextAuth
```

## Navigation (menu header)
Fichier : `src/components/layout/header/navigation.ts`
```
Accueil → /
HabbOne → dropdown :
  - Tous les articles → /news
  - Boutique → /boutique  ← AJOUTÉ CETTE SESSION
  - Equipe → /team
  - Partenaires → /partenaires
  - Communaute Discord → externe
Habbo → dropdown :
  - Habbo Attitude → externe
  - Service Client → externe
  - Boutique Habbo → externe
EXTRAS → dropdown :
  - Changements de pseudo Habbo → /pseudohabbo
  - Générateur d'avatar → /imager
  - Mobis → /mobis
  - Badges → /badges
Forum → /forum
```

## Ce qui a été fait cette session

### 1. Page Boutique `/boutique` — Refonte complète (commit 308ec66)
**Avant** : Page statique serveur avec 6 items, grille 3 colonnes, pas de recherche ni pagination.
**Après** : Page client interactive fidèle à la maquette Figma (node 197-2021) :
- `'use client'` avec useState/useMemo
- **En-tête** : icône boutique + titre "BOUTIQUE" + barre de recherche "Rechercher par nom" (fond `bg-white/10`, h-50px, rounded-3px)
- **Grille responsive** : 1 col → 2 → 3 → 4 colonnes (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`)
- **Carte produit (ShopCard)** : h-200px, bg-[#1F1F3E], rounded-8px
  - Image à gauche dans zone bg-[#303060] rounded-8px (100px largeur)
  - Nom en uppercase blanc
  - Prix avec icône `/img/icon-coin.png` (25x25px) dans cadre border-2 border-white/10 bg-black/10
  - Bouton "Acheter" bleu #2596FF ou "Indisponible" grisé avec bordure
- **Pagination** : flèches SVG + numéros de page, 16 items par page
- **Recherche** : filtrage temps réel par nom
- **16 items statiques** (8 actifs + 8 disabled) — données factices à remplacer par fetch Directus
- Tout en **français**

### 2. Navigation — Ajout lien Boutique (même commit)
- Ajouté `{ label: 'Boutique', href: '/boutique' }` dans le dropdown HabbOne
- Position : entre "Tous les articles" et "Equipe"

## Maquette Figma de référence
- **URL** : https://www.figma.com/design/y6MeQtsObtFFDUQCcGNUvr/Habbone--Copy-?node-id=197-2021&m=dev
- **Page** : "Shopping" — page boutique/lojinha
- **Composants Figma identifiés** :
  - `Header` (state Unlogged in / Logged in)
  - `ShopCard` (state Default / Disabled)
  - `Heading` (type Noticia / Hotel avec icônes)
  - `Paginacao` (pagination avec flèches angle-left/right)
  - `Footer` (5 colonnes : Redes sociais, HabbOne, Habbo Hotel, Fã-center, Desenvolvedores)
  - `Button` (Primary/Secondary, MD/SM/XS, Filled/Destroyed)
  - `TextInput` (Solid/Transparent, avec/sans label)
  - `Icons` (Arrow-left, Carrinho, Moeda, etc.)
  - `AmountItem` (champ + information avec icône moeda)
- **Palette Figma** : bg-900 #141433, bg-800 #1F1F3E, bg-500 #2C2C4F, bg-400 #303060, blue-500 #2596FF, green-500 #0FD42F, text-100 #FFF, text-400 #DDD, text-500 #BEBECE

## Patterns de code importants
- Pages serveur → fetch data, passent aux composants client
- Pages client → `'use client'`, useState, useMemo pour filtrage/pagination
- Images : `image-pixelated` pour rendu pixel-art, `next/image` pour optimisées, `<img>` pour icônes/assets
- Boutons : bg-[#2596FF] hover:bg-[#2976E8] pour primaires, bg-white/10 pour secondaires
- Cartes : bg-[#1F1F3E] ou bg-[#272746] avec border border-[#141433]
- Textes : font-bold uppercase tracking-[0.08em] pour titres, text-[#DDD] pour texte clair, text-[#BEBECE] pour texte secondaire
- Animations : Framer Motion (easings, dur, spring tokens dans `lib/motion-tokens.ts`)
- Le footer a des liens vers Boutique (déjà présent dans `footer.tsx`)

## Dépendances principales
next 15.5.9, react 19.1.0, next-auth 4.24.11, @directus/sdk 20.0.3,
framer-motion 12.23.12, tailwindcss 4.1.12, lucide-react 0.542.0,
@tiptap/* 3.3.0 (éditeur rich text), sonner 2.0.7, zod 4.1.5,
bcryptjs 3.0.2, ioredis 5.10.1, sanitize-html 2.17.0

## Infos serveur / déploiement
- Directus comme headless CMS (API backend)
- Redis pour cache
- Images distantes autorisées : Habbo CDN, Directus, api.habbone.fr
- `next.config.ts` configure les remotePatterns pour images

## Commits récents (avant cette session)
- fix: espace dans l'URL des images (trim sur mediaUrl)
- fix: images articles - ajouter api.habbone.fr dans remotePatterns
- fix: toutes les dates en timezone Europe/Paris + page team
- fix: lien mdp oublié sous les boutons Connexion/Inscription

## Langue
- L'interface utilisateur est en **français**
- Les données Directus sont parfois en portugais (héritage Habbo BR) : `titulo`, `descricao`, `noticia`, `imagem`, `categoria`
- Les noms de champs côté code restent en anglais/portugais pour compatibilité Directus
