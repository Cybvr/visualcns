"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MAX_KNOWLEDGE_LENGTH } from "@/lib/ngai-knowledge"
import { getNgaiKnowledge, saveNgaiKnowledge } from "@/lib/ngai-knowledge-store"

/** What Ngai knows about the agency. Clients' answers come from here. */
export default function NgaiKnowledgePage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (authLoading || !isAdmin) return
    let active = true
    getNgaiKnowledge()
      .then((knowledge) => { if (active) setContent(knowledge) })
      .catch((error) => {
        console.error("Could not load Ngai knowledge:", error)
        if (active) setMessage("Could not load the knowledge.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authLoading, isAdmin])


  async function save() {
    if (saving) return
    setSaving(true)
    setMessage("")
    try {
      await saveNgaiKnowledge(content)
      setMessage("Knowledge saved.")
    } catch (error) {
      console.error("Could not save Ngai knowledge:", error)
      setMessage("Could not save the knowledge.")
    } finally {
      setSaving(false)
    }
  }

  if (!authLoading && !isAdmin) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />
      <header className="mt-7">
        <h1 className="text-lg font-semibold">Ngai knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ngai answers client questions about your agency from this. Leave out anything clients shouldn&apos;t see.</p>
      </header>
      {loading ? <DashboardPageSkeleton variant="form" rows={6} /> : (
        <div className="mt-6 space-y-6">
          <Textarea aria-label="Ngai knowledge" rows={24} maxLength={MAX_KNOWLEDGE_LENGTH} value={content} onChange={(event) => { setContent(event.target.value); setMessage("") }} placeholder="Paste everything clients may ask about: services, pricing, how you work, policies, contact details, FAQs." />
          <div className="flex items-center gap-3"><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Save</Button>{message && <span className="text-sm text-muted-foreground" role="status">{message}</span>}</div>
        </div>
      )}
    </main>
  )
}
