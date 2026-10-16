import { INVOICE_ISSUER, formatDate, type InvoiceParty } from "@/lib/billing"
import { companyDocumentKindMeta, companyDocumentStatusMeta, documentTextLength, type CompanyDocument } from "@/lib/company-documents"
import { cn } from "@/lib/utils"

/** The printable document, shared by the dashboard detail page, the portal and the share link. */
export function CompanyDocumentView({ document: record, issuer = INVOICE_ISSUER }: { document: CompanyDocument; issuer?: InvoiceParty }) {
  const meta = companyDocumentStatusMeta[record.status] ?? companyDocumentStatusMeta.draft
  const kind = companyDocumentKindMeta[record.kind] ?? companyDocumentKindMeta.other

  return (
    <article className="mx-auto min-h-[70vh] min-w-0 max-w-full overflow-hidden border border-neutral-200 bg-white px-6 py-10 text-neutral-950 shadow-sm sm:px-14 sm:py-14 print:border-0 print:shadow-none">
      <header className="border-b border-neutral-300 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-neutral-600">{issuer.name}</p>
          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>
        </div>
        <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">{record.title}</h1>
        <p className="mt-3 text-sm text-neutral-500">
          {kind.label} for {record.client || "the client"}{record.project ? ` · ${record.project}` : ""}
        </p>
        {record.summary && <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-700">{record.summary}</p>}
      </header>

      <section className="py-10">
        {documentTextLength(record.body) > 0 ? (
          <div
            className="text-base text-neutral-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-2 [&_p]:leading-7 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:border-neutral-300 [&_h2]:text-neutral-950 [&_h3]:text-neutral-950 [&_table]:my-4 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [overflow-wrap:anywhere] [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-100 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-neutral-950"
            dangerouslySetInnerHTML={{ __html: record.body as string }}
          />
        ) : (
          <p className="text-base leading-7 text-neutral-500">This document hasn’t been written yet.</p>
        )}
      </section>

      <footer className="mt-16 grid items-end gap-8 border-t border-neutral-300 pt-8 text-sm text-neutral-500 sm:grid-cols-3">
        <div>
          <p className="font-medium text-neutral-950">{issuer.name}</p>
          <p className="mt-1">Prepared by</p>
          {issuer.email && <p className="mt-1">{issuer.email}</p>}
        </div>
        <div>
          <p className="font-medium text-neutral-950">{record.client || "Client"}</p>
          <p className="mt-1">Prepared for</p>
        </div>
        <p className="sm:text-right">{record.updatedAt ? `Updated ${formatDate(record.updatedAt.toDate().toISOString().slice(0, 10))}` : meta.label}</p>
      </footer>
    </article>
  )
}
