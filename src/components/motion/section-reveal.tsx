'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transitions, variants } from '@/lib/motion-tokens'

type SectionRevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section'
}

export default function SectionReveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: SectionRevealProps) {
  const reduce = useReducedMotion()
  const Comp = as === 'section' ? motion.section : motion.div

  return (
    <Comp
      initial={reduce ? false : variants.section.initial}
      whileInView={reduce ? undefined : variants.section.animate}
      viewport={{ once: true, amount: 0.18, margin: '0px 0px -12% 0px' }}
      transition={reduce ? { duration: 0 } : { ...transitions.section, delay }}
      className={cn('transform-gpu', className)}
      style={reduce ? undefined : { willChange: 'opacity, transform' }}
    >
      {children}
    </Comp>
  )
}
