'use client'

import React from 'react'
import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { transitions, variants } from '@/lib/motion-tokens'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()

  const transition: Partial<Transition> = reduce
    ? { duration: 0 }
    : transitions.page

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : variants.page.initial}
      animate={reduce ? undefined : variants.page.animate}
      transition={transition}
      style={reduce ? undefined : { willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  )
}
