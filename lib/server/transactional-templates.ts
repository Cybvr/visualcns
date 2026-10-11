import { adminServices } from "@/lib/firebase-admin"
import { TRANSACTIONAL_TEMPLATES, fillMessageTemplate } from "@/lib/transactional-templates"

export async function loadTransactionalMessage(agencyId: string, companyId: string, id: string, values: Record<string, string>) {
  const fallback = TRANSACTIONAL_TEMPLATES.find((template) => template.id === id)
  if (!fallback) throw new Error("Unknown transactional message.")
  let template: { subject: string; body: string } = fallback
  try {
    const collection = adminServices().db.collection("emailTemplates")
    const companyTemplate = await collection.doc(`${companyId}__${id}`).get()
    const snapshot = companyTemplate.exists ? companyTemplate : await collection.doc(`${agencyId}__${id}`).get()
    const saved = snapshot.data()
    if (saved?.agencyId === agencyId && (saved.companyId === companyId || saved.companyId === agencyId) && typeof saved.subject === "string" && saved.subject.trim() && typeof saved.body === "string" && saved.body.trim()) {
      // Validate the complete template before choosing it; invalid edits use the working fallback.
      fillMessageTemplate(saved.subject, values)
      fillMessageTemplate(saved.body, values, true)
      template = { subject: saved.subject, body: saved.body }
    }
  } catch (error) {
    console.error("Transactional template unavailable; using fallback", id, error)
  }
  const html = fillMessageTemplate(template.body, values, true)
  return { subject: fillMessageTemplate(template.subject, values), html, text: html.replace(/<\/p>|<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") }
}
