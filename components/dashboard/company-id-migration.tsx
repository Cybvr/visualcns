"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Database, Loader2 } from "lucide-react"
import { collection, deleteField, doc, getDocs, writeBatch } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"

const COLLECTIONS = [
  "users",
  "projects",
  "tasks",
  "invoices",
  "contracts",
  "estimates",
  "companyDocuments",
  "documents",
  "comments",
  "portalProjects",
  "portalTasks",
] as const

const BATCH_LIMIT = 400

type ScanResult = { collection: string; pending: number; legacy: number }[]

export function CompanyIdMigration() {
  const { isAdmin, isImpersonating } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isAdmin || isImpersonating) return null

  async function scan() {
    if (scanning || migrating || cleaning) return
    setScanning(true)
    setError(null)
    setMessage(null)
    try {
      const found: ScanResult = []
      for (const name of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, name))
        const pending = snapshot.docs.filter((item) => {
          const data = item.data()
          return data.clientId != null && data.companyId == null
        }).length
        const legacy = snapshot.docs.filter((item) => {
          const data = item.data()
          return data.clientId != null && data.companyId != null
        }).length
        found.push({ collection: name, pending, legacy })
      }
      setResult(found)
      setMessage("Scan complete. No records were changed.")
    } catch (scanError) {
      console.error("Company ID scan failed:", scanError)
      setError("The scan failed. Make sure you are signed in as an admin and try again.")
    } finally {
      setScanning(false)
    }
  }

  async function migrate() {
    if (scanning || migrating || cleaning || !result) return
    const total = result.reduce((sum, item) => sum + item.pending, 0)
    if (!total) {
      setMessage("Everything is already using companyId.")
      return
    }
    if (!window.confirm(`Copy clientId into companyId on ${total} record${total === 1 ? "" : "s"}?`)) return

    setMigrating(true)
    setError(null)
    setMessage(null)
    let migrated = 0
    try {
      for (const name of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, name))
        let batch = writeBatch(db)
        let pending = 0
        for (const item of snapshot.docs) {
          const data = item.data()
          if (data.clientId == null || data.companyId != null) continue
          batch.set(doc(db, name, item.id), { companyId: data.clientId }, { merge: true })
          pending += 1
          migrated += 1
          if (pending >= BATCH_LIMIT) {
            await batch.commit()
            batch = writeBatch(db)
            pending = 0
          }
        }
        if (pending) await batch.commit()
      }
      setResult(null)
      setMessage(`Migration complete. ${migrated} record${migrated === 1 ? "" : "s"} updated.`)
    } catch (migrationError) {
      console.error("Company ID migration failed:", migrationError)
      setError(`Migration stopped after ${migrated} record${migrated === 1 ? "" : "s"}. Scan again before retrying.`)
    } finally {
      setMigrating(false)
    }
  }

  async function cleanup() {
    if (scanning || migrating || cleaning || !result) return
    const total = result.reduce((sum, item) => sum + item.legacy, 0)
    const pending = result.reduce((sum, item) => sum + item.pending, 0)
    if (pending > 0) {
      setError("Some records still need migration. Migrate them before deleting any legacy fields.")
      return
    }
    if (!total) {
      setMessage("No legacy clientId fields remain.")
      return
    }
    if (!window.confirm(`Permanently remove clientId from ${total} migrated record${total === 1 ? "" : "s"}?`)) return

    setCleaning(true)
    setError(null)
    setMessage(null)
    let cleaned = 0
    try {
      for (const name of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, name))
        let batch = writeBatch(db)
        let pendingWrites = 0
        for (const item of snapshot.docs) {
          const data = item.data()
          if (data.clientId == null || data.companyId == null) continue
          batch.update(doc(db, name, item.id), { clientId: deleteField() })
          pendingWrites += 1
          cleaned += 1
          if (pendingWrites >= BATCH_LIMIT) {
            await batch.commit()
            batch = writeBatch(db)
            pendingWrites = 0
          }
        }
        if (pendingWrites) await batch.commit()
      }
      setResult(null)
      setMessage(`Cleanup complete. Removed clientId from ${cleaned} record${cleaned === 1 ? "" : "s"}.`)
    } catch (cleanupError) {
      console.error("Legacy client ID cleanup failed:", cleanupError)
      setError(`Cleanup stopped after ${cleaned} record${cleaned === 1 ? "" : "s"}. Scan again before retrying.`)
    } finally {
      setCleaning(false)
    }
  }

  const pending = result?.reduce((sum, item) => sum + item.pending, 0) ?? null
  const legacy = result?.reduce((sum, item) => sum + item.legacy, 0) ?? null

  return (
    <Card className="mt-8 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4" aria-hidden="true" />
          Company ID migration
        </CardTitle>
        <CardDescription>
          Copy existing client IDs into the new company ID field. This is safe to run more than once and does not delete the old field.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={scan} disabled={scanning || migrating || cleaning}>
            {scanning && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {scanning ? "Scanning…" : "Scan records"}
          </Button>
          {pending !== null && pending > 0 && (
            <Button type="button" onClick={migrate} disabled={scanning || migrating || cleaning}>
              {migrating && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {migrating ? "Migrating…" : `Migrate ${pending} record${pending === 1 ? "" : "s"}`}
            </Button>
          )}
          {legacy !== null && legacy > 0 && pending === 0 && (
            <Button type="button" variant="destructive" onClick={cleanup} disabled={scanning || migrating || cleaning}>
              {cleaning && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {cleaning ? "Cleaning up…" : `Delete ${legacy} old clientId field${legacy === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>

        {message && (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {message}
          </p>
        )}
        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4" aria-hidden="true" />
            {error}
          </p>
        )}
        {result && pending === 0 && !message && (
          <p className="mt-3 text-sm text-muted-foreground">No records need migration.</p>
        )}
      </CardContent>
    </Card>
  )
}
