"use client"

import { createElement, type ComponentType, type MouseEvent, type ReactNode } from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import type { IconType } from "react-icons"
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiCode,
  FiCompass,
  FiEdit3,
  FiGlobe,
  FiImage,
  FiLayers,
  FiMap,
  FiMousePointer,
  FiRepeat,
  FiSend,
  FiServer,
  FiShield,
  FiShoppingCart,
  FiTool,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi"

import { getToolIconSpecs } from "@/lib/tool-icons"
import { Button } from "@/components/ui/button"

export const planIcons: Record<string, IconType> = {
  cart: FiShoppingCart,
  chart: FiBarChart2,
  clock: FiClock,
  code: FiCode,
  compass: FiCompass,
  edit: FiEdit3,
  globe: FiGlobe,
  image: FiImage,
  layers: FiLayers,
  layout: FiMousePointer,
  map: FiMap,
  orbit: FiRepeat,
  pulse: FiActivity,
  rocket: FiSend,
  server: FiServer,
  shield: FiShield,
  tool: FiTool,
  trending: FiTrendingUp,
  zap: FiZap,
}

export function toSentenceCase(value: string) {
  const trimmed = value.trim().replace(/^and /, "")
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : trimmed
}

export function ToolChip({ tool }: { tool: string }) {
  const icons = getToolIconSpecs(tool)

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
      {icons.length > 0 ? (
        <span className="flex items-center gap-1.5">
          {icons.map(({ icon: Icon, color, label, textMark }) => (
            <span key={`${tool}-${label}`} aria-label={label} title={label}>
              {Icon
                ? createElement(Icon as ComponentType<{ className?: string; color?: string }>, {
                    className: "size-3.5",
                    color,
                  })
                : (
                  <span
                    className="inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] px-1 text-[9px] font-bold uppercase"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    {textMark}
                  </span>
                )}
            </span>
          ))}
        </span>
      ) : null}
      <span>{tool}</span>
    </span>
  )
}

export type OfferCardProps = {
  /** Small label above the title. Leave out when the page already groups cards, e.g. by tab. */
  eyebrow?: string
  badge?: string
  featured?: boolean
  title: string
  icon?: string
  price: string
  /** Shown as a pill (or beside the price when there is a badge). Leave out when a billing switch already says it. */
  timeline?: string
  description?: string
  features: string[]
  /** Shown crossed out after the features: what this option doesn't include. */
  excluded?: string[]
  featuresLabel?: string
  chips?: string[]
  ctaLabel: string
  ctaHref: string
  /** Opens the CTA in a new tab, for payment links that leave the site. */
  ctaExternal?: boolean
  /** Runs before following the CTA link, e.g. to add the item to the cart. */
  onCtaClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  /** Rendered under the CTA, e.g. a secondary action on a template card. */
  footer?: ReactNode
}

export function OfferCard({
  eyebrow,
  badge,
  featured,
  title,
  icon,
  price,
  timeline,
  description,
  features,
  excluded = [],
  featuresLabel = "What's included",
  chips,
  ctaLabel,
  ctaHref,
  ctaExternal,
  onCtaClick,
  footer,
}: OfferCardProps) {
  const Icon = icon ? (planIcons[icon] as ComponentType<{ className?: string }>) : undefined

  return (
    <div
      className={`group flex h-full flex-col rounded-2xl border p-6 transition-colors ${
        featured ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex-1">
        {(eyebrow || badge || timeline) && <div className="mb-4 flex items-start justify-between gap-3">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p> : <span />}
          {badge ? (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {badge}
            </span>
          ) : timeline ? (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {timeline}
            </span>
          ) : null}
        </div>}

        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              {createElement(Icon, { className: "size-5" })}
            </span>
          )}
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>

        {description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{price}</span>
          {badge && timeline && <span className="text-sm text-muted-foreground">{timeline}</span>}
        </div>

        <Button asChild className="mt-5 w-full" variant={featured ? "default" : "outline"}>
          {ctaExternal ? (
            <a href={ctaHref} target="_blank" rel="noopener noreferrer">
              {ctaLabel}
            </a>
          ) : (
            <Link href={ctaHref} onClick={onCtaClick}>{ctaLabel}</Link>
          )}
        </Button>

        {chips && chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <ToolChip key={chip} tool={chip} />
            ))}
          </div>
        )}

        {features.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 font-semibold">{featuresLabel}</p>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
              {excluded.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground/60" />
                  <span className="text-sm text-muted-foreground/60">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {footer}
    </div>
  )
}
