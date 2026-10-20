"use client"

import { useEffect } from "react"

import "./globals.css"

/** Shown when the root layout itself fails, so it brings its own html and body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-background font-sans antialiased">
        <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/visualhqlogo.svg" alt="VisualHQ" width={40} height={40} />
          <div className="max-w-sm space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">VisualCNS couldn&apos;t load. Try again in a moment.</p>
            {error.digest && <p className="font-mono text-xs text-muted-foreground">Error {error.digest}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={reset} className="inline-flex h-8 items-center rounded-full bg-button px-3 text-sm font-medium text-button-foreground hover:bg-button/90">
              Try again
            </button>
            <a href="/" className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-sm font-medium text-foreground hover:bg-accent">
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
