"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandLockupProps = {
  className?: string
  invert?: boolean
  logoSize?: number
  gapClassName?: string
  textClassName?: string
  wordmarkScale?: number
  logoUrl?: string
  brandName?: string
}

export function BrandLockup({
  className,
  invert = false,
  logoSize = 28,
  gapClassName = "gap-0.5",
  textClassName,
  wordmarkScale = 0.92,
  logoUrl = "/visualhqlogo.svg",
  brandName = "VisualCNS",
}: BrandLockupProps) {
  return (
    <span className={cn("inline-flex items-center", gapClassName, className)}>
      {logoUrl.startsWith("http") ? (
        // Tenant logos can be hosted by the configured upload provider.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={brandName} width={logoSize} height={logoSize} className={cn("shrink-0 object-contain", invert && "brightness-0 invert")} />
      ) : (
        <Image src={logoUrl} alt={brandName} width={logoSize} height={logoSize} className={cn("shrink-0", invert && "brightness-0 invert")} />
      )}
      <span
        className={cn(
          "poppins-wordmark leading-none",
          invert ? "text-primary-foreground" : "text-foreground",
          textClassName,
        )}
        style={{
          fontSize: `${Math.round(logoSize * wordmarkScale)}px`,
          lineHeight: "0.82",
          fontWeight: 400,
        }}
      >
        {brandName}
      </span>
    </span>
  )
}
