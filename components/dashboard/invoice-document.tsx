import Image from "next/image"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  INVOICE_ISSUER,
  formatDate,
  formatMoney,
  invoiceStatusMeta,
  type InvoiceParty,
  type Invoice,
} from "@/lib/billing"
import { cn } from "@/lib/utils"

type DocumentIssuer = InvoiceParty & { logoUrl?: string }

/** The printable invoice itself, shared by the signed-in detail page and the public share page. */
export function InvoiceDocument({ invoice, issuer = INVOICE_ISSUER }: { invoice: Invoice; issuer?: DocumentIssuer }) {
  const meta = invoiceStatusMeta[invoice.status] ?? invoiceStatusMeta.draft
  const balance = Math.max(0, invoice.amount - (invoice.amountPaid ?? 0))

  return (
    <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-md border border-border bg-card text-sm shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <header className="flex flex-col gap-8 border-b border-border px-6 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-10">
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
          {issuer.email && <p className="text-sm text-muted-foreground">{issuer.email}</p>}
          {issuer.phone && <p className="text-sm text-muted-foreground">{issuer.phone}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-muted-foreground">Invoice</p>
          <h1 className="mt-1 text-sm font-semibold tracking-[-0.03em]">{invoice.invoiceNumber}</h1>
          <span className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-sm font-medium", meta.className)}>{meta.label}</span>
        </div>
      </header>

      <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 sm:px-10">
        <section>
          <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Bill to</h2>
          <p className="mt-2 font-medium">{invoice.billTo?.name || invoice.client || "—"}</p>
          {invoice.billTo?.email && <p className="mt-1 text-sm text-muted-foreground">{invoice.billTo.email}</p>}
          {invoice.billTo?.address && <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{invoice.billTo.address}</p>}
          {invoice.project && <p className="mt-3 text-sm text-muted-foreground">Project: {invoice.project}</p>}
        </section>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:justify-self-end sm:text-right">
          <div><dt className="text-sm text-muted-foreground">Issued</dt><dd className="mt-1 text-sm font-medium">{formatDate(invoice.issuedOn)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Due</dt><dd className="mt-1 text-sm font-medium">{formatDate(invoice.dueOn)}</dd></div>
          {invoice.poReference && <div className="col-span-2"><dt className="text-sm text-muted-foreground">PO reference</dt><dd className="mt-1 text-sm font-medium">{invoice.poReference}</dd></div>}
        </dl>
      </div>

      {invoice.lineItems && invoice.lineItems.length > 0 && (
        <div className="overflow-x-auto border-y border-border">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.quantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatMoney(item.unitPrice, invoice.currency)}</TableCell>
                  <TableCell className="text-right">{formatMoney(Math.round(item.quantity * item.unitPrice), invoice.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 sm:px-10">
        <div className="space-y-5 text-sm leading-6 text-muted-foreground">
          {invoice.notes && <div><h2 className="font-medium text-foreground">Note</h2><p className="mt-1 whitespace-pre-line">{invoice.notes}</p></div>}
          {invoice.paymentInstructions && <div><h2 className="font-medium text-foreground">Payment instructions</h2><p className="mt-1 whitespace-pre-line">{invoice.paymentInstructions}</p></div>}
        </div>
        <dl className="space-y-3 sm:justify-self-end sm:min-w-64">
          {typeof invoice.subtotal === "number" && <div className="flex justify-between gap-8 text-sm"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(invoice.subtotal, invoice.currency)}</dd></div>}
          {(invoice.discountTotal ?? 0) > 0 && <div className="flex justify-between gap-8 text-sm"><dt className="text-muted-foreground">Discount</dt><dd>−{formatMoney(invoice.discountTotal ?? 0, invoice.currency)}</dd></div>}
          {(invoice.taxTotal ?? 0) > 0 && <div className="flex justify-between gap-8 text-sm"><dt className="text-muted-foreground">Tax</dt><dd>{formatMoney(invoice.taxTotal ?? 0, invoice.currency)}</dd></div>}
          <div className="flex justify-between gap-8 border-t border-border pt-3 font-semibold"><dt>Total</dt><dd>{formatMoney(invoice.amount, invoice.currency)}</dd></div>
          {(invoice.amountPaid ?? 0) > 0 && <div className="flex justify-between gap-8 text-sm"><dt className="text-muted-foreground">Paid</dt><dd>−{formatMoney(invoice.amountPaid ?? 0, invoice.currency)}</dd></div>}
          <div className="flex justify-between gap-8 border-t border-border pt-3 text-sm font-semibold"><dt>Balance due</dt><dd>{formatMoney(balance, invoice.currency)}</dd></div>
        </dl>
      </div>
    </article>
  )
}
