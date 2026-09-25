"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { recallPortalKey, rememberPortalKey } from "@/lib/portal-public"

export function PortalLoading() {
  return <div role="status" className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" aria-hidden="true" />Loading your workspace…</div>
}

export function PortalNotice({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div></div>
}

/** The share-link key for the company in the URL, if the visitor has one. */
const PortalKeyContext = createContext("")
export function usePortalKey() {
  return useContext(PortalKeyContext)
}

/** `/portal/<slug>/...` → `<slug>`; empty on the bare `/portal` entry page. */
function companySlugFromPath(pathname: string) {
  const segment = pathname.split("/")[2] || ""
  try { return decodeURIComponent(segment) } catch { return segment }
}

function Shell({ children }: { children: ReactNode }) {
  const { user, appUser, loading, signOut } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const router = useRouter()
  const slug = companySlugFromPath(pathname)
  const urlKey = searchParams.get("key")?.trim() || ""
  // Storage is only readable in the browser, so resolve the key after mount.
  const [portalKey, setPortalKey] = useState<{ slug: string; key: string } | null>(null)

  useEffect(() => {
    if (!slug) { setPortalKey({ slug, key: "" }); return }
    if (urlKey) rememberPortalKey(slug, urlKey)
    setPortalKey({ slug, key: urlKey || recallPortalKey(slug) })
  }, [slug, urlKey])

  const keyReady = portalKey?.slug === slug
  const key = keyReady ? portalKey.key : ""

  useEffect(() => {
    if (!loading && keyReady && !user && !key) router.replace(`/login?next=${encodeURIComponent(pathname + (search ? `?${search}` : ""))}`)
  }, [loading, keyReady, user, key, pathname, search, router])

  if (loading || !keyReady || (!user && !key)) return <PortalLoading />
  return <PortalKeyContext.Provider value={key}>
    <div className="portal-surface surface-body min-h-screen bg-background [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans">
      {appUser || key ? children : <PortalNotice title="We couldn’t load your account"><p>Sign out and try again. If this continues, contact your agency to check your access.</p><Button className="mt-4" variant="outline" size="sm" onClick={() => void signOut()}><LogOut className="size-4" />Sign out</Button></PortalNotice>}
    </div>
  </PortalKeyContext.Provider>
}

export function PortalShell({ children }: { children: ReactNode }) {
  return <AuthProvider><Shell>{children}</Shell></AuthProvider>
}
