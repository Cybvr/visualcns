import Image from "next/image"

import styles from "./app-entry-loader.module.css"

export type AppEntryPhase = "auth" | "workspace" | "complete"

export function AppEntryLoader({
  phase = "workspace",
  message,
}: {
  phase?: AppEntryPhase
  message?: string
}) {
  const status = message ?? (phase === "auth" ? "Signing you in" : phase === "complete" ? "Ready" : "Opening your workspace")

  return (
    <main className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-6 text-foreground" role="status" aria-live="polite">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Image src="/visualhqlogo.svg" alt="" width={224} height={224} priority className="mb-16 size-44 sm:size-56" />
        <div className="h-1 w-full overflow-hidden bg-muted" aria-hidden="true">
          <div className={styles.indicator} data-phase={phase} />
        </div>
        <p className="mt-8 text-3xl font-medium tracking-[-0.03em] sm:text-4xl">VisualCNS</p>
        <span className="sr-only">{status}</span>
      </div>
    </main>
  )
}
