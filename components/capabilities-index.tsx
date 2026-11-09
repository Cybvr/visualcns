"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUpRight } from "lucide-react"

import type { Capability } from "@/lib/capabilities"

const PLACEHOLDER = "/placeholder.svg?height=300&width=480&query=visualcns"

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function CapabilitiesIndex({ capabilities }: { capabilities: Capability[] }) {
  const peekRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const [active, setActive] = useState<number | null>(null)
  // The peek is enrichment for pointer users only: it never carries information
  // the row itself does not already state.
  const [peekEnabled, setPeekEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)")
    const calm = window.matchMedia("(prefers-reduced-motion: no-preference)")
    const sync = () => setPeekEnabled(fine.matches && calm.matches)

    sync()
    fine.addEventListener("change", sync)
    calm.addEventListener("change", sync)
    return () => {
      fine.removeEventListener("change", sync)
      calm.removeEventListener("change", sync)
    }
  }, [])

  // Only runs while a row is hovered. The lerp trails the cursor, and the gap
  // between target and actual doubles as a velocity read for the tilt.
  useEffect(() => {
    if (!peekEnabled || active === null) return

    let frame = requestAnimationFrame(function tick() {
      const p = pos.current
      const dx = p.tx - p.x
      p.x += dx * 0.14
      p.y += (p.ty - p.y) * 0.14

      if (peekRef.current) {
        peekRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      }
      if (innerRef.current) {
        innerRef.current.style.setProperty("--cap-tilt", `${clamp(dx * 0.14, -8, 8)}deg`)
      }
      frame = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(frame)
  }, [peekEnabled, active])

  const trackPointer = useCallback((event: React.PointerEvent<HTMLElement>) => {
    pos.current.tx = event.clientX
    pos.current.ty = event.clientY
  }, [])

  const enterRow = useCallback(
    (index: number) => (event: React.PointerEvent<HTMLElement>) => {
      const p = pos.current
      // Snap on the first entry so the frame does not fly in from the origin.
      if (active === null) {
        p.x = event.clientX
        p.y = event.clientY
      }
      p.tx = event.clientX
      p.ty = event.clientY
      setActive(index)
    },
    [active],
  )

  return (
    <>
      <div className="mt-16 flex items-baseline justify-between gap-6 pb-4 font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground md:mt-24">
        <span>Service</span>
        <span className="hidden md:inline">What it covers</span>
      </div>

      <ul className="cap-list" onPointerLeave={() => setActive(null)}>
        {capabilities.map((capability, index) => (
          <li key={capability.slug}>
            <Link
              href={`/capabilities/${capability.slug}`}
              className="cap-row group grid grid-cols-[2.25rem_minmax(0,1fr)_1.5rem] items-baseline gap-x-4 gap-y-4 border-t border-border py-8 outline-none md:grid-cols-[4rem_minmax(0,1fr)_20rem_2rem] md:gap-x-10 md:py-14"
              onPointerMove={peekEnabled ? trackPointer : undefined}
              onPointerEnter={peekEnabled ? enterRow(index) : undefined}
            >
              <span className="col-start-1 row-start-1 font-mono text-xs tabular-nums text-muted-foreground transition-colors group-hover:text-primary md:text-sm">
                {String(index + 1).padStart(2, "0")}
              </span>

              <h2 className="col-start-2 row-start-1 text-balance text-3xl tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary md:text-5xl lg:text-6xl">
                {capability.title}
              </h2>

              <span className="col-start-3 row-start-1 justify-self-end md:col-start-4">
                <ArrowUpRight className="size-5 text-muted-foreground transition-[transform,color] duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none md:size-6" />
              </span>

              {/* Pointer users get the image on the cursor; everyone else gets it here. */}
              <span className="col-start-2 row-start-2 block h-20 w-32 overflow-hidden bg-muted md:hidden">
                <img
                  src={capability.image || PLACEHOLDER}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </span>

              <span className="col-start-2 row-start-3 max-w-[42ch] text-sm leading-6 text-muted-foreground md:col-start-3 md:row-start-1 md:text-base md:leading-7">
                {capability.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {peekEnabled ? (
        <div ref={peekRef} className="cap-peek" aria-hidden data-active={active !== null}>
          <div ref={innerRef} className="cap-peek-inner">
            {capabilities.map((capability, index) => (
              <div key={capability.slug} className="cap-peek-frame" data-shown={active === index}>
                <img src={capability.image || PLACEHOLDER} alt="" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
