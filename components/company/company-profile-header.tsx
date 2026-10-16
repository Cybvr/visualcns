"use client"

import type { ReactNode } from "react"
import { Camera } from "lucide-react"

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"
}

/** Logo, name and handle, with any account action on the right. Sits at the top of the Home tab. */
export function CompanyProfileHeader({
  name,
  handle,
  logoUrl,
  publicPath,
  onChangeLogo,
  accountAction,
}: {
  name: string
  handle?: string
  logoUrl?: string
  publicPath?: string
  onChangeLogo?: () => void
  accountAction?: ReactNode
}) {
  return (
    <div className="pt-5 pb-1">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white md:size-12">
          {logoUrl ? (
            // Company logos can be hosted outside the configured image domains.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${name} logo`} className="size-8 object-contain md:size-9" />
          ) : onChangeLogo ? (
            <button
              type="button"
              onClick={onChangeLogo}
              aria-label="Add company image"
              className="flex size-full items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Camera className="size-5" aria-hidden="true" />
            </button>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">{initialsFor(name)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="surface-record-title m-0 truncate">{name}</h1>
          {handle && (
            <div className="truncate text-sm text-muted-foreground">
              {publicPath ? (
                <a href={publicPath} target="_blank" rel="noreferrer" className="outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                  @{handle}
                </a>
              ) : (
                <span>@{handle}</span>
              )}
            </div>
          )}
        </div>

        {accountAction && <div className="flex shrink-0 items-center gap-2 text-sm">{accountAction}</div>}
      </div>
    </div>
  )
}
