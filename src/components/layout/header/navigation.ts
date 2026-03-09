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
      { label: 'Archive des actualites', href: '/news' },
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
      { label: 'Boutique', href: 'https://www.habbo.fr/boutique', external: true },
    ],
  },
  {
    label: 'EXTRAS',
    children: [
      { label: 'Poster un sujet', href: '/forum' },
      { label: 'Habbo Imager', href: '/imager', prefetch: false },
    ],
  },
  { label: 'Forum', href: '/forum' },
]
