export const easings = {
  emph: [0.22, 1, 0.36, 1] as const,
  std: [0.2, 0, 0, 1] as const,
}

export const dur = {
  xs: 0.18,
  sm: 0.25,
  md: 0.35,
  lg: 0.5,
} as const

export const spring = {
  smooth: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 } as const,
}

export const transitions = {
  instant: { duration: dur.xs, ease: easings.std },
  quick: { duration: dur.sm, ease: easings.std },
  standard: { duration: dur.md, ease: easings.std },
  page: { duration: 0.28, ease: easings.emph },
  reveal: { duration: 0.22, ease: easings.emph },
} as const

export type EasingKey = keyof typeof easings
export type DurationKey = keyof typeof dur
