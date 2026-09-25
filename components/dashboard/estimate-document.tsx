import Image from "next/image"
import type { ReactNode } from "react"

import { INVOICE_ISSUER, estimateStatusMeta, formatDate, formatMoney, type Estimate, type InvoiceParty } from "@/lib/billing"
import { cn } from "@/lib/utils"

type DocumentIssuer = InvoiceParty & { logoUrl?: string }

function TextLines({ value }: { value?: string }) {
  const lines = value?.split("\n").map((line) => line.trim()).filter(Boolean) ?? []
  if (lines.length === 0) return <p className="mt-3 text-sm text-neutral-400">—</p>
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`} className="flex gap-2">
          <span className="mt-[0.7em] size-1 shrink-0 rounded-full bg-blue-700" aria-hidden="true" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

/** The printable estimate shared by the signed-in detail page and its public link. */
export function EstimateDocument({
  estimate,
  issuer = INVOICE_ISSUER,
  acceptanceAction,
}: {
  estimate: Estimate
  issuer?: DocumentIssuer
  acceptanceAction?: ReactNode
}) {
  const meta = estimateStatusMeta[estimate.status] ?? estimateStatusMeta.draft
  const optionalTotal = estimate.lineItems.reduce((sum, item) => sum + (item.optional ? item.amount : 0), 0)

  return (
    <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-md border border-border bg-card text-sm shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <header className="flex flex-col gap-8 border-b border-border px-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-10 sm:py-8">
        <div>
          <div className="flex items-center gap-3">
            {issuer.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={issuer.logoUrl} alt="" width={30} height={30} className="size-[30px] rounded object-cover" />
            ) : (
              <Image src="/visualhqlogo.svg" alt="" width={30} height={30} />
            )}
            <p className="text-sm font-semibold tracking-[-0.02em]">{issuer.name}</p>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{issuer.address}</p>
          {issuer.website && <p className="text-sm text-muted-foreground">{issuer.website}</p>}
          {issuer.phone && <p className="text-sm text-muted-foreground">{issuer.phone}</p>}
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-sm text-muted-foreground">Estimate</p>
          <h1 className="mt-1 text-sm font-semibold tracking-[-0.03em]">{estimate.estimateNumber}</h1>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex gap-3 sm:justify-end"><dt className="text-muted-foreground">Issued</dt><dd className="font-medium">{formatDate(estimate.issuedOn)}</dd></div>
            <div className="flex gap-3 sm:justify-end"><dt className="text-muted-foreground">Valid until</dt><dd className="font-medium">{formatDate(estimate.validUntil)}</dd></div>
          </dl>
          <span className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-sm font-medium", meta.className)}>{meta.label}</span>
        </div>
      </header>

      <section className="grid gap-8 px-3 py-6 sm:grid-cols-2 sm:px-10 sm:py-8">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Prepared for</h2>
          <p className="mt-2 font-semibold">{estimate.preparedFor?.name || estimate.client}</p>
          {estimate.preparedFor?.email && <p className="mt-1 text-sm text-muted-foreground">{estimate.preparedFor.email}</p>}
          {estimate.preparedFor?.address && <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{estimate.preparedFor.address}</p>}
          {estimate.project && <p className="mt-2 text-sm text-muted-foreground">{estimate.project}</p>}
        </div>
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Prepared by</h2>
          <p className="mt-2 font-semibold">{issuer.name}</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{issuer.address}</p>
          {issuer.website && <p className="text-sm text-muted-foreground">{issuer.website}</p>}
          {issuer.phone && <p className="text-sm text-muted-foreground">{issuer.phone}</p>}
        </div>
      </section>

      <section className="px-3 pb-7 sm:px-10 sm:pb-9">
        <h1 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{estimate.title}</h1>
        <div className="mt-4 border-t border-border" />
        {estimate.scope ? (
          <div
            className="mt-4 max-w-[75ch] text-sm leading-6 text-foreground [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: estimate.scope }}
          />
        ) : null}
      </section>

      <div className="hidden border-y border-border lg:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted/50 text-sm text-muted-foreground">
            <tr>
              <th className="w-[55%] px-6 py-3 font-medium sm:px-10">Description</th>
              <th className="w-[20%] px-4 py-3 font-medium">Billing</th>
              <th className="w-[25%] px-6 py-3 text-right font-medium sm:px-10">Amount ({estimate.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {estimate.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-normal break-words px-6 py-4 align-top sm:px-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.description}</span>
                    {item.optional && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Optional</span>}
                  </div>
                  {item.details && <p className="mt-1 max-w-[65ch] text-xs leading-5 text-muted-foreground">{item.details}</p>}
                </td>
                <td className="px-4 py-4 align-top text-muted-foreground">{item.billing || "One-time"}</td>
                <td className="px-6 py-4 text-right align-top font-medium sm:px-10">{formatMoney(item.amount, estimate.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-y border-border lg:hidden">
        {estimate.lineItems.map((item) => (
          <div key={item.id} className="space-y-3 border-b border-border px-3 py-4 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="whitespace-normal break-words font-medium">{item.description}</p>
                {item.optional && <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Optional</span>}
                {item.details && <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-muted-foreground">{item.details}</p>}
              </div>
              <p className="shrink-0 text-right font-medium">{formatMoney(item.amount, estimate.currency)}</p>
            </div>
            <p className="text-sm text-muted-foreground">{item.billing || "One-time"}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-8 px-3 py-6 sm:grid-cols-[1fr_18rem] sm:px-10 sm:py-8">
        <p className="max-w-[65ch] text-sm leading-6 text-muted-foreground">Optional items can be approved separately and will be added only if selected.</p>
        <dl className="space-y-3">
          <div className="flex justify-between gap-8 border-t border-neutral-300 pt-3 font-semibold"><dt>Base estimate</dt><dd>{formatMoney(estimate.amount, estimate.currency)}</dd></div>
          {optionalTotal > 0 && <div className="flex justify-between gap-8 text-sm text-neutral-500"><dt>Optional additions</dt><dd>{formatMoney(optionalTotal, estimate.currency)}</dd></div>}
        </dl>
      </section>

      <section className="grid gap-10 border-t border-border px-3 py-7 sm:grid-cols-2 sm:px-10 sm:py-9">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Terms</h2>
          <TextLines value={estimate.terms} />
        </div>
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Payment details</h2>
          <TextLines value={estimate.paymentDetails} />
        </div>
      </section>

      {acceptanceAction && (
        <section className="flex justify-end border-t border-border px-3 py-6 sm:px-10 print:hidden">
          {acceptanceAction}
        </section>
      )}

      {estimate.notes && (
        <section className="px-3 py-6 sm:px-10">
          <p className="max-w-[75ch] text-xs italic leading-5 text-muted-foreground">{estimate.notes}</p>
        </section>
      )}

      <footer className="border-t border-border px-3 py-6 text-sm leading-6 text-muted-foreground sm:px-10">
        <p>{issuer.address}</p>
        {issuer.website && <p>{issuer.website}</p>}
        {issuer.phone && <p>{issuer.phone}</p>}
      </footer>
    </article>
  )
}
