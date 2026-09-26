import { INVOICE_ISSUER, contractStatusMeta, formatDate, type Contract, type InvoiceParty } from "@/lib/billing"
import { cn } from "@/lib/utils"

/** The printable contract itself, shared by the signed-in detail page and the public share page. */
export function ContractDocument({ contract, issuer = INVOICE_ISSUER }: { contract: Contract; issuer?: InvoiceParty }) {
  const meta = contractStatusMeta[contract.status] ?? contractStatusMeta.draft

  return (
    <article className="mx-auto min-h-[70vh] border border-neutral-200 bg-white px-6 py-10 text-neutral-950 shadow-sm sm:px-14 sm:py-14 print:border-0 print:shadow-none">
      <header className="border-b border-neutral-300 pb-8 text-center">
        <p className="mb-4 text-sm font-medium text-neutral-600">{issuer.name}</p>
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>
        <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{contract.title}</h1>
        <p className="mt-3 text-sm text-neutral-500">Contract record</p>
      </header>

      <section className="py-10">
        <p className="max-w-2xl text-base leading-8 text-neutral-700">
          This agreement is recorded for <strong className="font-semibold text-neutral-950">{contract.client || "the client"}</strong>{contract.project ? <> in connection with <strong className="font-semibold text-neutral-950">{contract.project}</strong></> : null}.
        </p>
        {contract.body && (
          <div
            className="mt-8 text-base text-neutral-700 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-2 [&_p]:leading-7 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:border-neutral-300 [&_h2]:text-neutral-950 [&_h3]:text-neutral-950"
            dangerouslySetInnerHTML={{ __html: contract.body }}
          />
        )}

        <dl className="mt-10 grid gap-8 border-y border-neutral-200 py-8 sm:grid-cols-3">
          <div><dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">Effective date</dt><dd className="mt-2 text-sm font-medium">{formatDate(contract.startsOn)}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">End date</dt><dd className="mt-2 text-sm font-medium">{formatDate(contract.endsOn)}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">Signed date</dt><dd className="mt-2 text-sm font-medium">{formatDate(contract.signedOn)}</dd></div>
        </dl>
      </section>

      <footer className="mt-20 grid items-end gap-8 border-t border-neutral-300 pt-8 text-sm text-neutral-500 sm:grid-cols-3">
        <div>
          <p className="font-medium text-neutral-950">{issuer.name}</p>
          <p className="mt-1">Issuer</p>
          {issuer.address && <p className="mt-1 whitespace-pre-line">{issuer.address}</p>}
          {issuer.email && <p className="mt-1">{issuer.email}</p>}
          {issuer.phone && <p>{issuer.phone}</p>}
        </div>
        <div><p className="font-medium text-neutral-950">{contract.client || "Client"}</p><p className="mt-1">Contract party</p></div>
        <p className="sm:text-right">{contract.status === "signed" ? `Signed ${formatDate(contract.signedOn)}` : meta.label}</p>
      </footer>
    </article>
  )
}
