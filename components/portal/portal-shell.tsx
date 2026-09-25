"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LogOut } from "lucide-react"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function PortalLoading() {
  return <div role="status" aria-label="Loading your workspace" className="mx-auto min-h-[50vh] max-w-5xl space-y-6 px-6 py-10"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 max-w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-40 w-full rounded-xl" /></div></div>
}

export function PortalNotice({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div></div>
}

function Shell({ children }: { children: ReactNode }) {
  const { user, appUser, loading, signOut } = useAuth()
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const router = useRouter()
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname + (search ? `?${search}` : ""))}`)
  }, [loading, user, pathname, search, router])
  if (loading || !user) return <PortalLoading />
  return <div className="portal-surface surface-body min-h-screen bg-background [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans">
    {appUser ? children : <PortalNotice title="We couldn’t load your account"><p>Sign out and try again. If this continues, contact your agency to check your access.</p><Button className="mt-4" variant="outline" size="sm" onClick={() => void signOut()}><LogOut className="size-4" />Sign out</Button></PortalNotice>}
  </div>
}

export function PortalShell({ children }: { children: ReactNode }) {
  return <AuthProvider><Shell>{children}</Shell></AuthProvider>
}
