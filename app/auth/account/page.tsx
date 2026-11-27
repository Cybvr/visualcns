"use client"

import { useEffect, useRef } from "react"
import { onAuthStateChanged } from "firebase/auth"

import { auth } from "@/lib/firebase"
import { getUser } from "@/lib/users"
import { getOrganization, getOwnerOrganization, organizationRef } from "@/lib/organizations"

/** Pages on a person's own company profile that other apps (Juju Sites) link to by name. */
const DESTINATIONS: Record<string, string> = {
  home: "",
  products: "",
  billing: "/billings",
  settings: "/settings/account",
}

/**
 * Sends a signed-in person to a page on their own company profile, e.g.
 * /auth/account?to=billing. Apps that don't know the company's address link
 * here. Signed-out visitors sign in first and come back.
 */
export default function AccountRedirectPage() {
  const started = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const to = params.get("to") ?? "home"
    const suffix = DESTINATIONS[to] ?? ""
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (started.current) return
      started.current = true
      if (!user) {
        window.location.replace(`/login?next=${encodeURIComponent(`/auth/account?to=${encodeURIComponent(to)}`)}`)
        return
      }
      try {
        const profile = await getUser(user.uid)
        // Clients belong to a company; agency staff use their own business's page.
        const company = (profile?.companyId ? await getOrganization(profile.companyId) : null)
          ?? (profile?.role === "admin" || profile?.role === "superadmin" ? await getOwnerOrganization() : null)
        window.location.replace(company ? `/${encodeURIComponent(organizationRef(company))}${suffix}` : "/admin")
      } catch {
        window.location.replace("/admin")
      }
    })
    return unsubscribe
  }, [])

  return <main className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground" role="status">Opening your account…</main>
}
