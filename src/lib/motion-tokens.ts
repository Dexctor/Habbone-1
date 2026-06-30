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
  micro: { duration: 0.16, ease: easings.std },
  quick: { duration: dur.sm, ease: easings.std },
  standard: { duration: dur.md, ease: easings.soft },
  section: { duration: 0.62, ease: easings.soft },
  modal: { duration: 0.24, ease: easings.soft },
} as const

export const variants = {
  section: {
    initial: { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
  },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },
  modalPanel: {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.98 },
  },
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
} as const

export type EasingKey = keyof typeof easings
export type DurationKey = keyof typeof dur
