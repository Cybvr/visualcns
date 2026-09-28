import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import type { Invoice } from "@/lib/billing"
import { parseEmailList } from "@/lib/email-composer"
import { adminServices } from "@/lib/firebase-admin"
import { daysUntilDue, invoiceIsOpen, reminderBody, reminderStageFor, reminderSubject, todayIso } from "@/lib/invoice-reminders"
import { markdownToHtml } from "@/lib/markdown"
import { companyDocumentPath } from "@/lib/navigation"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { LINKEDIN_URL, SITE_ORIGIN, X_URL, brandedEmail, extractEmailAddress, normalizeEmailAddress } from "@/lib/server/email-branding"

// Runs once a day (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
// 1. Open invoices past their due date become "overdue".
// 2. Invoices with automatic reminders on get the reminder for today's stage, once.

export const dynamic = "force-dynamic"
export const maxDuration = 60

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Firestore rejects undefined fields, and older invoices can be missing some. */
function withoutUndefined<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as T
}

type Sender = { apiKey: string; from: string; replyTo: string; brand: { name?: string; logoUrl?: string; email?: string } } | null

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 })
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 })
  }

  const { db } = adminServices()
  const today = todayIso()
  const snapshot = await db.collection("invoices").where("status", "in", ["sent", "overdue"]).get()
  const senders = new Map<string, Sender>()
  const summary = { checked: snapshot.size, markedOverdue: 0, remindersSent: 0, failed: 0 }

  async function senderFor(agencyId: string): Promise<Sender> {
    if (senders.has(agencyId)) return senders.get(agencyId) ?? null
    const apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", process.env.RESEND_API_KEY || "")
    const from = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", process.env.EMAIL_FROM || ""))
    const replyTo = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_REPLY_TO", process.env.EMAIL_REPLY_TO || "")) || from
    const agency = (await db.collection("agencies").doc(agencyId).get()).data() || {}
    const sender = apiKey && from ? {
      apiKey,
      from,
      replyTo,
      brand: {
        name: typeof agency.name === "string" ? agency.name : undefined,
        logoUrl: typeof agency.logoUrl === "string" ? agency.logoUrl : undefined,
        email: typeof agency.senderEmail === "string" ? agency.senderEmail : undefined,
      },
    } : null
    senders.set(agencyId, sender)
    return sender
  }

  for (const item of snapshot.docs) {
    const invoice = { ...(item.data() as Omit<Invoice, "id">), id: item.id } as Invoice
    if (!invoiceIsOpen(invoice) || !invoice.agencyId) continue

    const days = invoice.dueOn ? daysUntilDue(invoice.dueOn, today) : null
    if (invoice.status === "sent" && days !== null && days < 0) {
      await item.ref.set({ status: "overdue" }, { merge: true })
      invoice.status = "overdue"
      summary.markedOverdue += 1
    }

    if (invoice.autoReminders !== true) continue
    const stage = reminderStageFor(invoice, today)
    const to = invoice.billTo?.email?.trim().toLowerCase() || ""
    if (!stage || (invoice.remindersSent ?? []).includes(stage) || !EMAIL_PATTERN.test(to)) continue

    const sender = await senderFor(invoice.agencyId)
    if (!sender) continue

    const cc = parseEmailList(invoice.reminderCc ?? []).valid.filter((email) => email !== to)
    const subject = reminderSubject(invoice, today)
    const text = reminderBody(invoice, today)
    const cta = { text: "View and pay", url: `${SITE_ORIGIN}${companyDocumentPath(invoice.companyId, "invoice", invoice.id)}` }
    const html = brandedEmail(markdownToHtml(text), subject, sender.brand, sender.from, cta)
    const footer = [sender.brand.name || "VisualCNS", extractEmailAddress(sender.from)].filter(Boolean).join(" · ")
    const plain = `${text}\n\n${cta.text}: ${cta.url}\n\n---\n${footer}\nX: ${X_URL}\nLinkedIn: ${LINKEDIN_URL}`

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sender.apiKey}`,
          "Content-Type": "application/json",
          // Same key for the same invoice, stage and day, so a retried run can't send twice.
          "Idempotency-Key": `invoice-reminder-${invoice.id}-${stage}-${today}`,
          "User-Agent": "VisualCNS Dashboard/1.0",
        },
        body: JSON.stringify({ from: sender.from, to: [to], ...(cc.length ? { cc } : {}), subject, text: plain, html, reply_to: sender.replyTo }),
        cache: "no-store",
      })
      const result = (await response.json().catch(() => ({}))) as { id?: string }
      if (!response.ok || !result.id) {
        summary.failed += 1
        continue
      }

      const now = new Date().toISOString()
      await item.ref.set({
        remindersSent: FieldValue.arrayUnion(stage),
        lastReminderAt: now,
        lastEmailSentAt: now,
        reminderCount: FieldValue.increment(1),
      }, { merge: true })
      // Show it in the email tool's Sent list like any other message.
      await db.collection("emailMessages").doc(result.id).set(withoutUndefined({
        id: result.id,
        agencyId: invoice.agencyId,
        companyId: invoice.companyId,
        createdBy: "automatic-reminder",
        providerId: result.id,
        to,
        ...(cc.length ? { cc } : {}),
        subject,
        createdAt: now,
        from: sender.from,
        replyTo: sender.replyTo,
        bodyHtml: html,
        bodyText: plain,
        recipients: [withoutUndefined({ email: to, name: invoice.billTo?.name || undefined, companyId: invoice.companyId })],
        documentType: "invoice",
        documentId: invoice.id,
        documentTitle: invoice.invoiceNumber,
        companyName: invoice.client,
        messageKind: "transactional",
        status: "sent",
      }))
      void recordAgencyUsage(invoice.agencyId, "emailsSent", 1 + cc.length).catch(() => undefined)
      summary.remindersSent += 1
    } catch {
      summary.failed += 1
    }
  }

  return NextResponse.json(summary)
}
