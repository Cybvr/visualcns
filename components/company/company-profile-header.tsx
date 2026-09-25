"use client"

import { Camera, ExternalLink, Globe2, Linkedin, MapPin, MoreVertical, Pencil, Share2, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
}: {
  name: string
  handle?: string
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
}) {
  const links = [
    linkedIn ? { label: "LinkedIn", href: externalHref(linkedIn), icon: Linkedin } : null,
  ].filter((link): link is { label: string; href: string; icon: typeof Globe2 } => Boolean(link))

  return (
    <section className="-mx-4 w-[calc(100%+2rem)] overflow-hidden rounded-none bg-card sm:mx-0 sm:w-auto sm:rounded-[24px]">
      <div className="relative h-20 overflow-hidden bg-company-banner sm:h-28">
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
            className="absolute bottom-3 right-3 h-8 px-3 text-xs bg-black/35 text-white hover:bg-black/55 hover:text-white sm:bottom-4 sm:right-4 sm:h-9 sm:px-4 sm:text-sm"
          >
            Change cover
          </Button>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="relative -mt-8 flex flex-col gap-3 sm:-mt-10 sm:gap-4 md:flex-row md:items-end">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted sm:size-20">
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
            {onChangeLogo && logoUrl && (
              <button
                type="button"
                onClick={onChangeLogo}
                aria-label="Change company logo"
                className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full bg-foreground text-background outline-none transition-colors hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Camera className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-2xl">{name}</h1>
                {handle && (publicPath ? (
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    @{handle}
                  </a>
                ) : (
                  <p className="truncate text-sm text-muted-foreground">@{handle}</p>
                ))}
                {categoryLabel && <p className="mt-0.5 truncate text-sm text-muted-foreground">{categoryLabel}</p>}
              </div>
              {admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="size-9" aria-label="Profile actions">
                    <MoreVertical className="size-5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {publicPath && (
                    <DropdownMenuItem asChild>
                      <a href={publicPath} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" aria-hidden="true" />
                        View site
                      </a>
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuItem onSelect={onShare}>
                      <Share2 className="size-4" aria-hidden="true" />
                      Share
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onSelect={onEdit}>
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit profile
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
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
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
          <span className="inline-flex items-center gap-2">
            <Users className="size-4" aria-hidden="true" />
            {contactCount} contact{contactCount === 1 ? "" : "s"}
          </span>
        </div>

        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-3.5 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
