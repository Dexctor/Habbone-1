'use client'

import React from 'react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { transitions } from '@/lib/motion-tokens'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()

  const transition: Partial<Transition> = reduce ? transitions.instant : transitions.standard

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={transition}
        layout
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
