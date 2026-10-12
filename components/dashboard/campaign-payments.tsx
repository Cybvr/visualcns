"use client"

import Link from "next/link"
import { toast } from "sonner"

import type { Invoice } from "@/lib/billing"
import { updateCampaignPerson, type CampaignPerson } from "@/lib/campaign-people"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

interface CampaignPaymentsProps {
  people: CampaignPerson[]
  invoices: Invoice[]
  canEdit: boolean
  invoiceHref?: (invoice: Invoice) => string
}

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`

const invoiceTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  overdue: "bg-red-500/15 text-red-700 dark:text-red-300",
  void: "bg-muted text-muted-foreground line-through",
}

/** What the campaign pays its creators, and the invoices raised for it. */
export function CampaignPayments({ people, invoices, canEdit, invoiceHref }: CampaignPaymentsProps) {
  const paidPeople = people.filter((person) => person.pay > 0)
  const total = paidPeople.reduce((sum, person) => sum + person.pay, 0)
  const settled = paidPeople.filter((person) => person.paid).reduce((sum, person) => sum + person.pay, 0)

  async function togglePaid(person: CampaignPerson, paid: boolean) {
    try {
      await updateCampaignPerson(person.id, { paid })
    } catch (error) {
      console.error("Error saving payment:", error)
      toast.error("That change didn't save.")
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Creators</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Tile label="Total" value={naira(total)} />
          <Tile label="Paid" value={naira(settled)} />
          <Tile label="Still to pay" value={naira(total - settled)} />
        </div>

        {paidPeople.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No one to pay yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-3 font-medium">Handle</th>
                  <th scope="col" className="px-3 py-3 font-medium">App</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Pay</th>
                  <th scope="col" className="w-20 px-3 py-3 text-center font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {paidPeople.map((person) => (
                  <tr key={person.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium">{person.handle}</td>
                    <td className="px-3 py-3">{person.app}</td>
                    <td className="px-3 py-3">{person.status}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{naira(person.pay)}</td>
                    <td className="px-3 py-3 text-center">
                      {canEdit ? (
                        <input type="checkbox" checked={person.paid} onChange={(event) => void togglePaid(person, event.target.checked)} aria-label={`Paid ${person.handle}`} className="size-4 accent-foreground" />
                      ) : person.paid ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Invoices</h3>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border border-y border-border">
            {invoices.map((invoice) => {
              const content = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{invoice.title || invoice.invoiceNumber || "Invoice"}</p>
                    {invoice.invoiceNumber && invoice.title && <p className="text-xs text-muted-foreground">{invoice.invoiceNumber}</p>}
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", invoiceTone[invoice.status] ?? invoiceTone.draft)}>{invoice.status}</span>
                  <span className="w-32 text-right tabular-nums text-foreground">{formatMoney(invoice.amount, invoice.currency)}</span>
                </>
              )
              const href = invoiceHref?.(invoice)
              return href ? (
                <Link key={invoice.id} href={href} className="flex items-center gap-3 py-3 text-sm outline-none transition-colors hover:text-foreground focus-visible:bg-muted/50">{content}</Link>
              ) : (
                <div key={invoice.id} className="flex items-center gap-3 py-3 text-sm">{content}</div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em] text-foreground">{value}</p>
    </div>
  )
}
