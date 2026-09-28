"use client"

import { useState, type ReactNode } from "react"
import { ArrowRight, Loader2, LogOut, Search } from "lucide-react"

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
      <div className="relative py-4 sm:py-10">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mb-4 size-12 rounded-xl object-cover" />
        )}
        <p className="kiosk-welcome">Welcome to</p>
        <h1 className="kiosk-company-name">{companyName}</h1>
        <p className="kiosk-subtitle">Please sign in as a visitor</p>
      </div>
      <ReceptionIllustration initials={initialsOf(companyName || "Welcome")} className="kiosk-hero-art" />
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

export type KioskTab = "sign-in" | "sign-out"

/** Sign In / Sign Out switch under the welcome block. The count is who's in now. */
export function KioskTabs({ value, onChange, count }: { value: KioskTab; onChange: (tab: KioskTab) => void; count: number }) {
  return (
    <div role="tablist" aria-label="Sign in or sign out" className="kiosk-tabs">
      <button type="button" role="tab" aria-selected={value === "sign-in"} onClick={() => onChange("sign-in")} className="kiosk-tab">
        Sign In
      </button>
      <button type="button" role="tab" aria-selected={value === "sign-out"} onClick={() => onChange("sign-out")} className="kiosk-tab">
        Sign Out{count > 0 && <span className="kiosk-tab-count">{count}</span>}
      </button>
    </div>
  )
}

type OnSiteVisitor = { id: string; name: string; at?: number }

function timeIn(at?: number) {
  return at ? `In since ${new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "Signed in"
}

/**
 * Everyone signed in right now, like the gate book: find your name, tap it,
 * confirm. The confirm step stops people signing out the wrong person.
 */
export function KioskNameList({ visitors, onSignOut, busy = false }: { visitors: OnSiteVisitor[]; onSignOut: (id: string) => void; busy?: boolean }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const words = search.trim().toLowerCase()
  const shown = words ? visitors.filter((visitor) => visitor.name.toLowerCase().includes(words)) : visitors

  if (!visitors.length) {
    return <p className="kiosk-empty">Nobody is signed in right now.</p>
  }

  return (
    <div>
      <p className="kiosk-list-hint">Find your name and tap it to sign out.</p>
      {visitors.length > 6 && (
        <div className="kiosk-field-card mt-3">
          <span className="kiosk-field-icon" aria-hidden="true"><Search /></span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your name" aria-label="Search your name" className="kiosk-input" />
        </div>
      )}
      <ul className="mt-3 space-y-2.5">
        {shown.map((visitor) => (
          <li key={visitor.id}>
            {picked === visitor.id ? (
              <div className="kiosk-name-row kiosk-name-row-picked">
                <div className="min-w-0 flex-1">
                  <p className="kiosk-name">Sign out {visitor.name}?</p>
                  <p className="kiosk-name-time">{timeIn(visitor.at)}</p>
                </div>
                <button type="button" onClick={() => setPicked(null)} className="kiosk-mini kiosk-mini-quiet">Cancel</button>
                <button type="button" onClick={() => onSignOut(visitor.id)} disabled={busy} className="kiosk-mini">
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Yes"}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setPicked(visitor.id)} className="kiosk-name-row">
                <span className="kiosk-avatar" aria-hidden="true">{visitor.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="kiosk-name block truncate">{visitor.name}</span>
                  <span className="kiosk-name-time block">{timeIn(visitor.at)}</span>
                </span>
                <LogOut className="kiosk-name-icon" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        {!shown.length && <li className="kiosk-empty">No one by that name. Check the spelling.</li>}
      </ul>
    </div>
  )
}
