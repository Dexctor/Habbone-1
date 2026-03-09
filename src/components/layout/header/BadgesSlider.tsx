'use client'

import React, { useEffect, useRef } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function BadgesSlider() {
  const boxRef = useRef<HTMLDivElement>(null)
  const prevRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLDivElement>(null)

  const updateArrows = () => {
    const box = boxRef.current
    const prev = prevRef.current
    const next = nextRef.current
    if (!box || !prev || !next) return
    const atStart = box.scrollLeft <= 0
    const atEnd = Math.ceil(box.scrollLeft + box.clientWidth) >= box.scrollWidth
    prev.classList.toggle('swiper-button-disabled', atStart)
    prev.setAttribute('aria-disabled', String(atStart))
    next.classList.toggle('swiper-button-disabled', atEnd)
    next.setAttribute('aria-disabled', String(atEnd))
  }
  const scrollBadges = (dir: -1 | 1) => {
    const box = boxRef.current
    if (!box) return
    const step = Math.max(1, Math.floor(box.clientWidth / 56)) * 61
    box.scrollTo({ left: box.scrollLeft + dir * step, behavior: 'smooth' })
    setTimeout(updateArrows, 200)
  }

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    updateArrows()
    const onScroll = () => updateArrows()
    box.addEventListener('scroll', onScroll, { passive: true })
    return () => box.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div id="badges-free" className="col-4 pl-0 w-full lg:w-1/3 hidden lg:block">
      <div className="badges-free flex h-[92px] items-center w-full pl-[20px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="order-0 swiper-button-disabled w-[50px] h-[50px] text-[1.125rem] bg-[rgba(255,255,255,.1)] text-[#BEBECE] hover:bg-[#2596FF] hover:text-white transition-colors rounded-[4px] flex items-center justify-center"
                id="prev-badges"
                ref={prevRef}
                onClick={() => scrollBadges(-1)}
                tabIndex={-1}
                role="button"
                aria-disabled="true"
              >
                <i className="material-icons">chevron_left</i>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">Précédent</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="boxs-badges-free order-1 w-full px-[10px] overflow-x-auto overflow-y-hidden scroll-smooth" ref={boxRef}>
          <div className="swiper freeBadges inline-block w-auto overflow-visible">
            <div className="swiper-wrapper inline-flex flex-nowrap items-center" aria-live="polite">
              <div className="swiper-slide swiper-slide-active flex-[0_0_auto]" role="group" aria-label="1 / 42" style={{ width: 56, marginRight: 5 }}>
                <a className="box-badge block p-2 rounded hover:bg-[rgba(255,255,255,.1)] transition-colors" href="https://habbone.fr/news/106/coiffure-capuche">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="http://images.habbo.com/c_images/album1584/LIC04.gif" alt="LIC04" width={35} className="mx-auto" />
                </a>
              </div>
              <div className="swiper-slide swiper-slide-next flex-[0_0_auto]" role="group" aria-label="2 / 42" style={{ width: 56, marginRight: 5 }}>
                <a className="box-badge block p-2 rounded hover:bg-[rgba(255,255,255,.1)] transition-colors" href="https://habbone.fr/news/105/chignon-decolore">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="http://images.habbo.com/c_images/album1584/JCL04.gif" alt="JCL04" width={35} className="mx-auto" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="order-2 w-[50px] h-[50px] text-[1.125rem] bg-[rgba(255,255,255,.1)] text-[#BEBECE] hover:bg-[#2596FF] hover:text-white transition-colors rounded-[4px] flex items-center justify-center"
                id="next-badges"
                ref={nextRef}
                onClick={() => scrollBadges(1)}
                tabIndex={0}
                role="button"
              >
                <i className="material-icons">chevron_right</i>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">Suivant</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
