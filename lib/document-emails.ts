import type { Contract, Estimate, Invoice } from "@/lib/billing"
import type { CompanyDocument } from "@/lib/company-documents"
import type { EmailComposeContext } from "@/lib/email-composer"
import { companyDocumentPath } from "@/lib/navigation"

/**
 * Opening the email composer for an invoice, estimate, contract or document.
 * The composer writes the message with the record's link in its text.
 *
 * Records only store their company's id, so callers pass `companyRef`, the
 * company's slug from `organizationRef()`, and links use the public slug URL.
 */

/** "Invoice INV-0001: Website redesign", or just the number when the record has no name. */
function numberedTitle(kind: string, number: string, name?: string) {
  const numbered = `${kind} ${number}`.trim()
  return name?.trim() ? `${numbered}: ${name.trim()}` : numbered
}

export function invoiceEmailContext(invoice: Invoice, companyRef: string): EmailComposeContext {
  const title = numberedTitle("Invoice", invoice.invoiceNumber, invoice.title)
  return {
    companyId: invoice.companyId,
    companyName: invoice.client,
    recipientEmail: invoice.billTo?.email,
    recipientName: invoice.billTo?.name,
    projectId: invoice.projectId,
    projectName: invoice.project,
    documentType: "invoice",
    documentId: invoice.id,
    documentTitle: title,
    subject: title,
    ctaText: "View invoice",
    ctaUrl: companyDocumentPath(companyRef, "invoice", invoice.id),
  }
}

export function estimateEmailContext(estimate: Estimate, companyRef: string): EmailComposeContext {
  const title = numberedTitle("Estimate", estimate.estimateNumber, estimate.title)
  return {
    companyId: estimate.companyId,
    companyName: estimate.client,
    recipientEmail: estimate.preparedFor?.email,
    recipientName: estimate.preparedFor?.name,
    projectId: estimate.projectId,
    projectName: estimate.project,
    documentType: "estimate",
    documentId: estimate.id,
    documentTitle: title,
    subject: title,
    ctaText: "View estimate",
    ctaUrl: companyDocumentPath(companyRef, "estimate", estimate.id),
  }
}

export function contractEmailContext(contract: Contract, companyRef: string): EmailComposeContext {
  return {
    companyId: contract.companyId,
    companyName: contract.client,
    projectId: contract.projectId,
    projectName: contract.project,
    documentType: "contract",
    documentId: contract.id,
    documentTitle: contract.title,
    subject: contract.title,
    ctaText: "Review contract",
    ctaUrl: companyDocumentPath(companyRef, "contract", contract.id),
  }
}

export function companyDocumentEmailContext(record: CompanyDocument, companyRef: string): EmailComposeContext {
  return {
    companyId: record.companyId,
    companyName: record.client,
    projectId: record.projectId,
    projectName: record.project,
    documentType: "companyDocument",
    documentId: record.id,
    documentTitle: record.title,
    subject: `${record.title} is ready for review`,
    ctaText: "Review document",
    ctaUrl: companyDocumentPath(companyRef, "document", record.id),
  }
}
