"use client"

import { useState } from "react"
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
 * Second-level product bar for /ngai. The page renders the site <Header pinned={false} />,
 * so that bar scrolls away and this one sticks to the top of the viewport.
 */
export function NgaiProductHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
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
