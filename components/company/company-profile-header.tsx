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
      <section className="-mx-4 w-[calc(100%+2rem)] overflow-hidden rounded-none sm:mx-0 sm:w-auto sm:rounded-lg">
        <div className="relative h-24 overflow-hidden bg-company-banner sm:h-32">
        {coverUrl && (
          // Uploaded media is user-controlled, so keep this as a plain image rather than requiring host allowlisting.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover opacity-75" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-[#172554]/90 via-[#312e81]/70 to-[#0f172a]/90" aria-hidden="true" />
        {onChangeCover && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onChangeCover}
            className="absolute top-3 right-3 h-8 px-3 text-xs bg-black/35 text-white hover:bg-black/55 hover:text-white sm:top-4 sm:right-4 sm:h-9 sm:px-4 sm:text-sm"
          >
            Change cover
          </Button>
        )}
        {admin && (onShare || onEdit) && (
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 sm:bottom-4 sm:right-4">
            {onShare && (
              <Button type="button" variant="secondary" size="sm" onClick={onShare} className="h-9 px-4">
                <Share2 className="size-4" aria-hidden="true" />
                Share
              </Button>
            )}
            {onEdit && (
              <Button type="button" variant="secondary" size="sm" onClick={onEdit} className="h-9 px-4">
                <Pencil className="size-4" aria-hidden="true" />
                Edit profile
              </Button>
            )}
          </div>
        )}
        </div>
      </section>

      <div
        className="relative bg-background print:static"
      >
        <section className="px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
        <div className="relative flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end">
          <div className="relative -mt-12 size-20 shrink-0 overflow-hidden rounded-full bg-muted sm:-mt-16 sm:size-28">
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

          <div className="min-w-0 flex-1 pb-1">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold! tracking-[-0.025em] text-foreground sm:text-xl">{name}</h1>
              <div className="sidebar-nav-label mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
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
                {location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4" aria-hidden="true" />
                    {location}
                  </span>
                )}
                {website && (
                  <a
                    href={externalHref(website)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Globe2 className="size-4" aria-hidden="true" />
                    <span className="truncate underline-offset-4 hover:underline">{website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</span>
                  </a>
                )}
                <span className="inline-flex items-center gap-2">
                  {contactCount} contact{contactCount === 1 ? "" : "s"}
                </span>
              </div>
              {description && <div className="sidebar-nav-label mt-0.5 truncate text-muted-foreground">{description}</div>}
              {categoryLabel && <div className="sidebar-nav-label mt-0.5 truncate text-muted-foreground">{categoryLabel}</div>}
            </div>
          </div>
        </div>

        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="sidebar-nav-label inline-flex items-center gap-2 rounded-full bg-muted/50 px-3.5 py-2 font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
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
