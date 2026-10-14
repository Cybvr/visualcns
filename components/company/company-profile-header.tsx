"use client"

import type { ReactNode } from "react"
import { Camera, Pencil, Share2 } from "lucide-react"

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"
}

// The dashboard forces buttons, links and paragraphs to inherit font size, so
// text sizes here sit on wrappers and spans rather than on those elements.
const actionClass =
  "inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-background px-3 font-medium text-foreground outline-none transition-colors hover:bg-page focus-visible:ring-2 focus-visible:ring-ring"

export function CompanyProfileHeader({
  name,
  handle,
  logoUrl,
  publicPath,
  admin,
  onShare,
  onEdit,
  onChangeLogo,
  accountAction,
  tabs,
  heading,
}: {
  name: string
  handle?: string
  description?: string
  categoryLabel?: string
  logoUrl?: string
  coverUrl?: string
  location?: string
  website?: string
  linkedIn?: string
  contactCount: number
  publicPath?: string
  admin?: boolean
  onShare?: () => void
  onEdit?: () => void
  onChangeLogo?: () => void
  onChangeCover?: () => void
  accountAction?: ReactNode
  tabs?: ReactNode
  /** Shows this as the title in place of the logo, name and handle. */
  heading?: string
}) {
  return (
    <>
      {heading ? (
        <h1 className="mt-2 mb-4 truncate text-[18px] tracking-[-0.02em] text-foreground md:text-[23px]">{heading}</h1>
      ) : (
        // Compact profile row: logo, name and handle, with actions on the right.
        <div className="-mx-4 -mt-4 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:-mt-6 md:mx-0 md:mt-0 md:px-0 md:py-4">
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
              <h1 className="m-0 truncate text-[17px] tracking-[-0.02em] text-foreground md:text-[20px]">{name}</h1>
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

            {((admin && (onShare || onEdit)) || accountAction) && (
              <div className="flex shrink-0 items-center gap-2 text-sm">
                {accountAction}
                {onShare && (
                  <button type="button" onClick={onShare} className={actionClass}>
                    <Share2 className="size-4" aria-hidden="true" />
                    Share
                  </button>
                )}
                {onEdit && (
                  <button type="button" onClick={onEdit} className={actionClass}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs live outside the profile block so they can stick under the header while scrolling. */}
      {tabs && (
        <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background print:hidden sm:-mx-6 md:static md:mx-0">
          {tabs}
        </div>
      )}
    </>
  )
}
