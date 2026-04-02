export type NavEntry = {
  label: string
  href?: string
  external?: boolean
  children?: NavEntry[]
  prefetch?: boolean
}

export const navigation: NavEntry[] = [
  { label: 'Accueil', href: '/' },
  {
    label: 'HabbOne',
    children: [
      { label: 'Tous les articles', href: '/news' },
      { label: 'Equipe', href: '/team' },
      { label: 'A propos', href: '/about' },
      { label: 'Partenaires', href: '/partenaires' },
      { label: 'Communaute Discord', href: 'https://discord.gg/s4NpDcgcWe', external: true },
    ],
  },
  {
    label: 'Habbo',
    children: [
      { label: 'Habbo Attitude', href: 'https://www.habbo.fr/playing-habbo/habbo-way', external: true },
      { label: 'Service Client', href: 'https://help.habbo.fr/hc/fr', external: true },
      { label: 'Boutique Habbo', href: 'https://www.habbo.fr/shop', external: true },
    ],
  },
  {
    label: 'EXTRAS',
    children: [
      { label: 'Changements de pseudo Habbo', href: '/pseudohabbo' },
      { label: 'Générateur d\'avatar', href: '/imager', prefetch: false },
      { label: 'Mobis', href: '/mobis' },
      { label: 'Badges', href: '/badges' },
    ],
  },
  { label: 'Forum', href: '/forum' },
]
