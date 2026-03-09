'use client'

import { motion } from 'framer-motion'
import React from 'react'

type BannerProps = {
  slow: any
}

export default function Banner({ slow }: BannerProps) {
  return (
    <motion.section
      layout
      className="bg flex items-center justify-center w-full min-h-[250px] md:min-h-[350px] lg:min-h-[400px] bg-[#204E84]"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={slow as any}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/HabbOne25_Logo_DefaultAnimated2_byLFM.gif"
        alt="HabbOne"
        className="h-auto max-w-full"
        loading="lazy"
      />
    </motion.section>
  )
}
