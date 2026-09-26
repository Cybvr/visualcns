"use client"

import type { ReactNode } from "react"
import { Camera, Globe2, Linkedin, MapPin, Pencil, Share2 } from "lucide-react"

function externalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

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
  description,
  categoryLabel,
  logoUrl,
  coverUrl,
  location,
  website,
  linkedIn,
  contactCount,
  publicPath,
  admin,
  onShare,
  onEdit,
  onChangeLogo,
  onChangeCover,
  tabs,
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
  tabs?: ReactNode
}) {
  const links = [
    linkedIn ? { label: "LinkedIn", href: externalHref(linkedIn), icon: Linkedin } : null,
  ].filter((link): link is { label: string; href: string; icon: typeof Globe2 } => Boolean(link))

  return (
    <>
      {/* Full-bleed white profile block on phones; sits in the page column on desktop. */}
      <div className="-mx-4 -mt-4 border-b border-border bg-background sm:-mx-6 sm:-mt-6 md:mx-0 md:mt-0">
        <div className="px-3 pt-3 md:px-0 md:pt-0">
          <div className="relative h-[104px] overflow-hidden rounded-[14px] border border-border bg-[linear-gradient(120deg,#FBEFE2_0%,#FBE6E9_50%,#E6F3E8_100%)] dark:bg-[linear-gradient(120deg,#2a211c_0%,#2b1f24_50%,#1c2a20_100%)] md:h-44 md:rounded-2xl">
            {coverUrl && (
              // Uploaded media is user-controlled, so keep this as a plain image rather than requiring host allowlisting.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
            )}
            {onChangeCover && (
              <button
                type="button"
                onClick={onChangeCover}
                className="absolute top-2.5 right-2.5 inline-flex h-8 items-center rounded-lg border border-border bg-white/85 px-2.5 font-medium text-[#16181D] outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring md:top-4 md:right-4"
              >
                <span className="text-[13px]">Change cover</span>
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 md:px-6 md:pb-5">
          <div className="relative z-[1] -mt-9 flex items-end justify-between gap-3 md:-mt-12">
            <div className="grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white shadow-[0_0_0_4px_var(--background)] md:size-24">
              {logoUrl ? (
                // Company logos can be hosted outside the configured image domains.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={`${name} logo`} className="size-14 object-contain md:size-[72px]" />
              ) : onChangeLogo ? (
                <button
                  type="button"
                  onClick={onChangeLogo}
                  aria-label="Add company image"
                  className="flex size-full items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <Camera className="size-6" aria-hidden="true" />
                </button>
              ) : (
                <span className="text-xl font-semibold text-muted-foreground md:text-2xl">{initialsFor(name)}</span>
              )}
            </div>

            {admin && (onShare || onEdit) && (
              <div className="flex shrink-0 items-center gap-2 text-sm">
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

          <h1 data-weight="bold" className="mt-3 mb-0.5 truncate text-[21px] tracking-[-0.02em] text-foreground md:text-[26px]">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-muted-foreground">
            {handle && (publicPath ? (
              <a
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className="truncate font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                @{handle}
              </a>
            ) : (
              <span className="truncate font-semibold text-foreground">@{handle}</span>
            ))}
            <span>{contactCount} contact{contactCount === 1 ? "" : "s"}</span>
            {categoryLabel && <span className="truncate">{categoryLabel}</span>}
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {location}
              </span>
            )}
            {website && (
              <a
                href={externalHref(website)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Globe2 className="size-4" aria-hidden="true" />
                <span className="truncate underline-offset-4 hover:underline">{website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</span>
              </a>
            )}
          </div>
          {description && <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</div>}

          {links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {links.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-page px-3 font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs live outside the profile block so they can stick under the header while scrolling. */}
      {tabs && (
        <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background print:hidden sm:-mx-6 md:static md:mx-0">
          {tabs}
        </div>
      )}
    </>
  )
}
