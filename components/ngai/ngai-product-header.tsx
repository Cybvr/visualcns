"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { NGAI_APP_URL } from "@/lib/ngai"
import { Button } from "@/components/ui/button"
import { NgaiProjectsMenu } from "./ngai-projects-menu"

const LINKS = [
  { name: "Overview", href: "#overview" },
  { name: "Templates", href: "#templates" },
  { name: "Pricing", href: "#pricing" },
]

/**
 * Second-level product bar for /ngai. The site <Header /> is position: fixed, so we
 * measure its bar and expose the height as --site-header-h for the spacer + sticky offset.
 */
export function NgaiProductHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const bar = document.querySelector<HTMLElement>("header > div:first-child")
    if (!bar) return
    const update = () => document.documentElement.style.setProperty("--site-header-h", `${bar.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty("--site-header-h")
    }
  }, [])

  return (
    <>
      <div aria-hidden style={{ height: "var(--site-header-h, 64px)" }} />
      <div
        className="sticky z-40 border-b border-border bg-background/95 backdrop-blur-md"
        style={{ top: "var(--site-header-h, 64px)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-8 md:px-20">
          <a href="#overview" className="text-lg font-semibold tracking-tight">
            Ngai
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Ngai">
            {LINKS.map((link) => (
              <Button key={link.href} variant="ghost" asChild>
                <a href={link.href}>{link.name}</a>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NgaiProjectsMenu className="hidden md:inline-flex" />
            <Button asChild>
              <a href={NGAI_APP_URL}>Start for Free</a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={open ? "Close Ngai menu" : "Open Ngai menu"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {open && (
          <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden" aria-label="Ngai">
            {LINKS.map((link) => (
              <Button key={link.href} variant="ghost" className="justify-start" asChild>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.name}
                </a>
              </Button>
            ))}
            <NgaiProjectsMenu className="justify-start" />
          </nav>
        )}
      </div>
    </>
  )
}
