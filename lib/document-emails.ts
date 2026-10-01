import type { Contract, Estimate, Invoice } from "@/lib/billing"
import type { CompanyDocument } from "@/lib/company-documents"
import type { EmailComposeContext } from "@/lib/email-composer"
import { companyDocumentPath } from "@/lib/navigation"

/**
 * Opening the email composer for an invoice, estimate, contract or document.
 * The composer writes the message with the record's link in its text.
 */

export function invoiceEmailContext(invoice: Invoice): EmailComposeContext {
  return {
    companyId: invoice.companyId,
    companyName: invoice.client,
    recipientEmail: invoice.billTo?.email,
    recipientName: invoice.billTo?.name,
    projectId: invoice.projectId,
    projectName: invoice.project,
    documentType: "invoice",
    documentId: invoice.id,
    documentTitle: `Invoice ${invoice.invoiceNumber}`,
    subject: `Invoice ${invoice.invoiceNumber}`,
    ctaText: "View invoice",
    ctaUrl: companyDocumentPath(invoice.companyId, "invoice", invoice.id),
  }
}

export function estimateEmailContext(estimate: Estimate): EmailComposeContext {
  const title = estimate.title || `Estimate ${estimate.estimateNumber}`
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
    subject: `Estimate ${estimate.estimateNumber}: ${estimate.title}`.replace(/: $/, ""),
    ctaText: "View estimate",
    ctaUrl: companyDocumentPath(estimate.companyId, "estimate", estimate.id),
  }
}

export function contractEmailContext(contract: Contract): EmailComposeContext {
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
    ctaUrl: companyDocumentPath(contract.companyId, "contract", contract.id),
  }
}

export function companyDocumentEmailContext(record: CompanyDocument): EmailComposeContext {
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
    ctaUrl: companyDocumentPath(record.companyId, "document", record.id),
  }
}
