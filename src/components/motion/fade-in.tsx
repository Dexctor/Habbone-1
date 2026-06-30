'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/motion-tokens'

type AsProp<T extends keyof React.JSX.IntrinsicElements> = {
  as?: T
} & React.ComponentPropsWithoutRef<T>

export default function FadeIn<T extends keyof React.JSX.IntrinsicElements = 'div'>(
  props: AsProp<T> & { delay?: number }
) {
  const { as, className, children, delay = 0, ...rest } = props as AsProp<T> & { delay?: number }
  const reduce = useReducedMotion()

  type MotionTag = keyof typeof motion
  const tag = (as || 'div') as MotionTag
  const Comp = motion[tag] as React.ComponentType<Record<string, unknown>>
  const initial = reduce ? false : { opacity: 0, y: 10 }
  const animate = reduce ? undefined : { opacity: 1, y: 0 }

  return (
    <Comp
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, margin: '-6% 0px -6% 0px' }}
      transition={reduce ? { duration: 0 } : { ...transitions.reveal, delay }}
      style={reduce ? undefined : { willChange: 'opacity, transform' }}
      className={cn(className)}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Comp>
  )
}
