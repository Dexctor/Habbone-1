export const easings = {
  emph: [0.22, 1, 0.36, 1] as const,
  std: [0.2, 0, 0, 1] as const,
  soft: [0.16, 1, 0.3, 1] as const,
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
  page: { duration: 0.32, ease: easings.soft },
  reveal: { duration: 0.38, ease: easings.soft },
  section: { duration: 0.62, ease: easings.soft },
} as const

export const variants = {
  page: {
    initial: { opacity: 0.96, y: 8 },
    animate: { opacity: 1, y: 0 },
  },
  reveal: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },
  section: {
    initial: { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
  },
} as const

export type EasingKey = keyof typeof easings
export type DurationKey = keyof typeof dur
