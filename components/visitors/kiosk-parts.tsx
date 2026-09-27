import type { ReactNode } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

import { ReceptionIllustration } from "@/components/visitors/reception-illustration"

/** "ABC Company" becomes "ABC"; "Ada Obi Ltd" becomes "AOL". For the wall sign in the picture. */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1 || /^[A-Z]{2,4}$/.test(words[0])) return words[0].slice(0, 4).toUpperCase()
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase()
}

/** The welcome block: greeting on the left, front-desk picture fading in on the right. */
export function KioskHero({ companyName, logoUrl }: { companyName: string; logoUrl?: string }) {
  return (
    <header className="kiosk-hero relative">
      <ReceptionIllustration initials={initialsOf(companyName || "Welcome")} className="kiosk-hero-art" />
      <div className="relative max-w-[66%] self-center py-6 sm:max-w-[60%]">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mb-4 size-12 rounded-xl object-cover" />
        )}
        <p className="kiosk-welcome">Welcome to</p>
        <h1 className="kiosk-company-name">{companyName}</h1>
        <p className="kiosk-subtitle">Please sign in as a visitor</p>
      </div>
    </header>
  )
}

/** One white input card: icon on the left, small label over the value. */
export function KioskField({ icon, label, htmlFor, children }: { icon: ReactNode; label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="kiosk-field-card">
      <span className="kiosk-field-icon" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="kiosk-field-label">{label}</label>
        {children}
      </div>
    </div>
  )
}

export function KioskSubmit({ busy = false }: { busy?: boolean }) {
  return (
    <button type="submit" disabled={busy} className="kiosk-submit">
      <span>Sign In</span>
      {busy ? <Loader2 className="kiosk-submit-arrow animate-spin" aria-hidden="true" /> : <ArrowRight className="kiosk-submit-arrow" aria-hidden="true" />}
    </button>
  )
}
