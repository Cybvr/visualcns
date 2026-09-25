"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { CheckCircle2, LogIn } from "lucide-react"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { BrandLockup } from "@/components/brand-lockup"
import { FinanceAppShell } from "@/components/finance/finance-app-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const signInHighlights = [
  "AI-assisted document review and QofE synthesis",
  "Deal pipeline, portfolio monitoring, and LP reporting in one workspace",
  "Standardized outputs your IC and investors can read the same day",
]

function FinanceSignIn({ signInWithGoogle }: { signInWithGoogle: () => void }) {
  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground md:flex md:flex-col md:justify-between md:p-12 lg:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, rgba(173, 199, 247, 0.35) 0%, rgba(0, 32, 69, 0) 55%)",
          }}
        />

        <div className="relative flex items-center gap-3">
          <BrandLockup logoSize={26} invert />
          <span className="text-xs font-semibold uppercase tracking-widest opacity-70">Finance</span>
        </div>

        <div className="relative space-y-8">
          <h2 className="fin-headline text-4xl leading-tight lg:text-5xl">
            Quality of Earnings,
            <br />
            automated.
          </h2>
          <p className="max-w-md text-sm leading-6 opacity-80">
            The diligence workspace private equity teams use to move from data room to LP-ready report in days — not weeks.
          </p>
          <ul className="space-y-3 text-sm">
            {signInHighlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 opacity-80" strokeWidth={2} />
                <span className="opacity-90">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-60">
          Restricted to authorized team members.
        </p>
      </aside>

      <div className="flex min-h-screen items-center justify-center px-6 py-12 md:min-h-0 md:px-10 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 md:hidden">
            <BrandLockup logoSize={28} />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Finance</span>
          </div>

          <h1 className="fin-headline text-3xl text-primary md:text-4xl">Workspace sign in</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Continue with your team Google account to open pipeline, analysis, and reporting workflows.
          </p>

          <Button onClick={signInWithGoogle} className="mt-8 w-full" size="lg">
            <LogIn className="size-4" />
            Continue with Google
          </Button>

          <p className="mt-8 text-xs text-muted-foreground">
            Looking for the product overview?{" "}
            <Link href="/finance" className="font-semibold text-primary hover:underline">
              Back to VisualCNS Finance
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function FinanceWorkspace({ children }: { children: ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6" role="status" aria-label="Loading finance dashboard">
        <div className="mx-auto max-w-6xl space-y-5"><Skeleton className="h-8 w-48" /><Skeleton className="h-12 w-full" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div></div>
      </div>
    )
  }

  if (!user) {
    return <FinanceSignIn signInWithGoogle={signInWithGoogle} />
  }

  return <FinanceAppShell>{children}</FinanceAppShell>
}

export default function FinanceAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FinanceWorkspace>{children}</FinanceWorkspace>
    </AuthProvider>
  )
}
