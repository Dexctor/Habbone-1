export type NavEntry = {
  label: string
  href?: string
  external?: boolean
  children?: NavEntry[]
  prefetch?: boolean
}

export const navigation: NavEntry[] = [
  { label: 'Home', href: '/' },
  {
    label: 'HabbOne',
    children: [
      { label: 'Archive de notícias', href: '/news' },
      { label: 'Equipe', href: '/team' },
      { label: 'A propos', href: '/about' },
      { label: 'Partenaires', href: '/partenaires' },
      { label: 'Communauté Discord', href: 'https://discord.gg/s4NpDcgcWe', external: true },
    ],
  },
  {
    label: 'Habbo',
    children: [
      { label: 'Habbo Attitude', href: 'https://www.habbo.fr/playing-habbo/habbo-way', external: true },
      { label: 'Service Client', href: 'https://help.habbo.fr/hc/fr', external: true },
      { label: 'Boutique', href: 'https://www.habbo.fr/shop', external: true },
    ],
  },
  {
    label: 'EXTRAS',
    children: [
      { label: "Habbo Imager", href: '/imager', prefetch: false },
      { label: 'Rechercher utilisateurs', href: '/pseudohabbo', prefetch: false },
      { label: 'Rechercher mobis', href: '/mobis', prefetch: false },
    ],
  },
  { label: 'Forum', href: '/forum' },
]
