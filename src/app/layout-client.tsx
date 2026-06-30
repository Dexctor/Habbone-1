'use client'

import React from 'react'
import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { transitions } from '@/lib/motion-tokens'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()

  const transition: Partial<Transition> = reduce
    ? { duration: 0 }
    : transitions.page

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.992 }}
      animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={transition}
      style={reduce ? undefined : { transformOrigin: '50% 0%', willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  )
}
