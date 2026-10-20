"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Shown in place of any page that crashes, instead of Next's "Application error". */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Image src="/visualhqlogo.svg" alt="VisualHQ" width={40} height={40} />
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">This page hit a problem. Try again, and if it keeps happening, go back home.</p>
        {error.digest && <p className="font-mono text-xs text-muted-foreground">Error {error.digest}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  )
}
