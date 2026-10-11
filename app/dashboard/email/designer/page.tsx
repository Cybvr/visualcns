"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getEmailTemplates, saveEmailTemplate, type EmailTemplateRecord } from "@/lib/email-templates-store"
import { TRANSACTIONAL_TEMPLATES, fillMessageTemplate } from "@/lib/transactional-templates"
import { brandedEmail } from "@/lib/server/email-branding"

const examples: Record<string, string> = { visitorName: "Ada Okafor", arrivalTime: "just signed in", companyName: "BBDO West Africa", visitorDetails: "From: Example company · Reason: Scheduled meeting", inviterName: "Your colleague", inviteUrl: "https://www.visualcns.com/invite/example" }

export default function MessageDesigner() {
  const { user, isAdmin } = useAuth()
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [selected, setSelected] = useState<EmailTemplateRecord | null>(null)
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mobilePreview, setMobilePreview] = useState(false)

  useEffect(() => {
    if (!user || !isAdmin) return
    let active = true
    getEmailTemplates("", true).then((rows) => {
      if (!active) return
      const transactional = rows.filter((row) => TRANSACTIONAL_TEMPLATES.some((template) => template.id === row.templateId))
      setTemplates(transactional)
      setSelected(transactional[0] ?? null)
    }).catch(() => { if (active) setNotice("Templates could not be loaded. Refresh to try again.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, isAdmin])

  const definition = TRANSACTIONAL_TEMPLATES.find((template) => template.id === selected?.templateId)
  let preview = ""
  let validationError = ""
  if (selected) {
    try {
      const values = Object.fromEntries((definition?.variables ?? []).map((key) => [key, examples[key]]))
      preview = brandedEmail(fillMessageTemplate(selected.body, values, true), fillMessageTemplate(selected.subject, values), { name: "BBDO West Africa" }, "", null)
    } catch (error) { validationError = error instanceof Error ? error.message : "Check the message variables." }
  }

  async function save() {
    if (!selected || saving || validationError) return
    if (!selected.name.trim() || !selected.subject.trim() || !selected.body.trim()) return setNotice("Add a name, subject and message before saving.")
    setSaving(true)
    try {
      const updated = { ...selected, updatedAt: new Date().toISOString() }
      await saveEmailTemplate(updated)
      setTemplates((rows) => rows.map((row) => row.id === updated.id ? updated : row))
      setNotice("Saved. Future transactional emails will use this message.")
    } catch { setNotice("The message could not be saved. Try again.") }
    finally { setSaving(false) }
  }

  if (!isAdmin) return null
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/dashboard/email" className="text-sm text-muted-foreground">Back to email</Link><h2 className="mt-2 text-xl font-semibold">Message Designer</h2></div>
        <Button onClick={() => void save()} disabled={!selected || saving || Boolean(validationError)}>{saving ? "Saving…" : "Save message"}</Button>
      </div>
      {notice && <p role="status" className="mb-4 text-sm">{notice}</p>}
      {loading ? <p role="status">Loading templates…</p> : !templates.length ? <p>No transactional templates have been seeded for this agency.</p> : (
        <>
          <nav aria-label="Transactional templates" className="mb-5 flex flex-wrap gap-2">{templates.map((template) => <Button key={template.id} variant={selected?.id === template.id ? "secondary" : "ghost"} onClick={() => { setSelected(template); setNotice("") }}>{template.name}</Button>)}</nav>
          {selected && <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className="min-w-0 space-y-4" aria-label="Message editor">
              <div><Label htmlFor="message-name">Name</Label><Input id="message-name" className="mt-2" value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} /></div>
              <div><Label htmlFor="message-subject">Subject</Label><Input id="message-subject" className="mt-2" value={selected.subject} onChange={(event) => setSelected({ ...selected, subject: event.target.value })} /></div>
              <div><Label>Message</Label><RichTextEditor value={selected.body} onChange={(body) => setSelected({ ...selected, body })} allowHtml className="mt-2 min-h-80" /></div>
              <p className="text-sm leading-6 text-muted-foreground">Variables: {definition?.variables.map((variable) => `{{${variable}}}`).join(", ")}. These are filled with real details when sent. The header and footer are added automatically.</p>
              {validationError && <p role="alert" className="text-sm text-destructive">{validationError}</p>}
            </section>
            <section className="min-w-0" aria-label="Message preview">
              <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-medium">Preview · example details</h3><Button variant="outline" size="sm" onClick={() => setMobilePreview(!mobilePreview)}>{mobilePreview ? "Desktop" : "Mobile"}</Button></div>
              <iframe title="Transactional email preview" sandbox="" srcDoc={preview} className={`mx-auto h-[700px] max-w-full border-0 bg-muted ${mobilePreview ? "w-[375px]" : "w-full"}`} />
            </section>
          </div>}
        </>
      )}
    </main>
  )
}
