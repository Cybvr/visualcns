"use client"

import type { ReactNode } from "react"
import { Camera, Globe2, Linkedin, MapPin, Pencil, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"

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
      <section className="-mx-4 w-[calc(100%+2rem)] overflow-hidden rounded-none sm:mx-0 sm:w-auto sm:rounded-2xl">
        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-rose-100 via-orange-50 to-emerald-100 dark:from-rose-950/40 dark:via-background dark:to-emerald-950/40 sm:h-44">
          {coverUrl && (
            // Uploaded media is user-controlled, so keep this as a plain image rather than requiring host allowlisting.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          {onChangeCover && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onChangeCover}
              className="absolute top-3 right-3 h-8 gap-1.5 border border-border bg-background/80 px-3 text-xs text-foreground shadow-sm backdrop-blur hover:bg-background sm:top-4 sm:right-4 sm:h-9 sm:px-4 sm:text-sm"
            >
              <Camera className="size-4" aria-hidden="true" />
              Change cover
            </Button>
          )}
        </div>
      </section>

      <div className="relative bg-background print:static">
        <section className="px-4 pb-4 pt-0 sm:px-6 sm:pb-5">
          <div className="flex items-end justify-between gap-3">
            <div className="relative -mt-12 size-20 shrink-0 overflow-hidden rounded-full bg-background ring-4 ring-background sm:-mt-16 sm:size-28">
              <div className="size-full overflow-hidden rounded-full bg-muted">
                {logoUrl ? (
                  // Company logos can be hosted outside the configured image domains.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={`${name} logo`} className="size-full object-cover" />
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
                  <span className="flex size-full items-center justify-center text-xl font-semibold text-muted-foreground sm:text-2xl">
                    {initialsFor(name)}
                  </span>
                )}
              </div>
            </div>

            {admin && (onShare || onEdit) && (
              <div className="flex shrink-0 items-center gap-2 pb-1">
                {onShare && (
                  <Button type="button" variant="outline" size="sm" onClick={onShare}>
                    <Share2 className="size-4" aria-hidden="true" />
                    Share
                  </Button>
                )}
                {onEdit && (
                  <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">{name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
            {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>

          {links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {links.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3.5 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
          )}
        </section>
        {tabs}
      </div>
    </>
  )
}
