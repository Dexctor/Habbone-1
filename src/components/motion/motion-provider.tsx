'use client'

import React from 'react'
import { MotionConfig, useReducedMotion, type Transition } from 'framer-motion'
import { transitions } from '@/lib/motion-tokens'

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  // Respect OS prefers-reduced-motion
  const reduce = useReducedMotion()

  const transition: Partial<Transition> = reduce
    ? { duration: 0 }
    : transitions.standard

  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      {children}
    </MotionConfig>
  )
}
