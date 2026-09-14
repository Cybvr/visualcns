"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [state, setState] = useState<"loading" | "ready" | "done" | "error">("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    if (loading) return
    if (!user) { setState("ready"); return }
    let active = true
    user.getIdToken().then((idToken) => fetch("/api/invites/accept", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token }),
    })).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not accept invite")
      if (active) { setState("done"); setTimeout(() => router.replace("/dashboard"), 800) }
    }).catch((acceptError) => { if (active) { setError(acceptError instanceof Error ? acceptError.message : "Could not accept invite"); setState("error") } })
    return () => { active = false }
  }, [loading, user, params.token, router])

  return <main className="flex min-h-svh items-center justify-center px-4"><section className="w-full max-w-md space-y-4 border border-border p-7 text-center">
    {state === "loading" && <Loader2 className="mx-auto size-6 animate-spin" />}
    {state === "ready" && <><h1 className="text-xl font-semibold">You’ve been invited</h1><p className="text-sm text-muted-foreground">Sign in or create your account with the invited email to join the agency workspace.</p><Button asChild><Link href={`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`}>Sign in to accept</Link></Button><p className="text-sm text-muted-foreground">New here? <Link className="underline" href={`/signup?invite=${params.token}`}>Create an account</Link></p></>}
    {state === "done" && <><h1 className="text-xl font-semibold">Invite accepted</h1><p className="text-sm text-muted-foreground">Taking you to your workspace…</p></>}
    {state === "error" && <><h1 className="text-xl font-semibold">Invite unavailable</h1><p className="text-sm text-destructive">{error}</p><Button asChild variant="outline"><Link href="/login">Return to sign in</Link></Button></>}
  </section></main>
}
