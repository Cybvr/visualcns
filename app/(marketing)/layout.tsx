import type { ReactNode } from "react"
import { MetaPixel } from "@/components/meta-pixel"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-surface">
      <MetaPixel />
      {children}
    </div>
  )
}
