"use client"

import { useRouter } from "next/navigation"
import { DollarSign, Receipt, UserRound } from "lucide-react"
import { toast } from "sonner"

import { CollectionView } from "@/components/dashboard/collection-view"
import { thumbnailIcon } from "@/components/dashboard/grid-card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { invoiceStatusMeta, type Invoice } from "@/lib/billing"
import { formatPay, payCurrency, updateCampaignPerson, type CampaignPerson } from "@/lib/campaign-people"
import { formatMoney } from "@/lib/money"

interface CampaignPaymentsProps {
  people: CampaignPerson[]
  invoices: Invoice[]
  canEdit: boolean
  invoiceHref?: (invoice: Invoice) => string
}

/** Adds up pay per currency and shows each, e.g. "$500 · ₦50,000". */
function sumByCurrency(people: CampaignPerson[]) {
  const totals = new Map<string, number>()
  for (const person of people) totals.set(payCurrency(person), (totals.get(payCurrency(person)) ?? 0) + person.pay)
  return totals.size ? [...totals].map(([currency, amount]) => formatPay(amount, currency)).join(" · ") : formatPay(0, "USD")
}

type Entry =
  | { key: string; kind: "creator"; title: string; status: string; amount: string; person: CampaignPerson }
  | { key: string; kind: "invoice"; title: string; status: string; amount: string; invoice: Invoice }

/** What the campaign pays its creators and the invoices raised for it, in one list. */
export function CampaignPayments({ people, invoices, canEdit, invoiceHref }: CampaignPaymentsProps) {
  const router = useRouter()
  const paidPeople = people.filter((person) => person.pay > 0)

  async function setPaid(person: CampaignPerson, paid: boolean) {
    try {
      await updateCampaignPerson(person.id, { paid })
    } catch (error) {
      console.error("Error saving payment:", error)
      toast.error("That change didn't save.")
    }
  }

  const entries: Entry[] = [
    ...paidPeople.map((person) => ({
      key: `creator-${person.id}`,
      kind: "creator" as const,
      title: person.handle,
      status: person.paid ? "Paid" : "To pay",
      amount: formatPay(person.pay, payCurrency(person)),
      person,
    })),
    ...invoices.map((invoice) => ({
      key: `invoice-${invoice.id}`,
      kind: "invoice" as const,
      title: invoice.title?.trim() || invoice.invoiceNumber || "Invoice",
      status: invoiceStatusMeta[invoice.status]?.label ?? invoice.status,
      amount: formatMoney(invoice.amount, invoice.currency),
      invoice,
    })),
  ]

  function open(entry: Entry) {
    if (entry.kind === "invoice") {
      const href = invoiceHref?.(entry.invoice)
      if (href) router.push(href)
    } else if (canEdit) {
      void setPaid(entry.person, !entry.person.paid)
    }
  }

  return (
    <CollectionView
      className=""
      items={entries}
      getKey={(entry) => entry.key}
      searchFields={(entry) => [entry.title, entry.status, entry.amount, entry.kind === "creator" ? entry.person.app : "Invoice"]}
      searchPlaceholder="Search payments"
      viewKey="campaign-payments"
      before={
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Tile label="Creators total" value={sumByCurrency(paidPeople)} />
          <Tile label="Paid" value={sumByCurrency(paidPeople.filter((person) => person.paid))} />
          <Tile label="Still to pay" value={sumByCurrency(paidPeople.filter((person) => !person.paid))} />
        </div>
      }
      empty={{ icon: DollarSign, title: "No payments yet" }}
      card={(entry) => {
        const Icon = entry.kind === "creator" ? UserRound : Receipt
        return {
          icon: <Icon className={entry.kind === "creator" ? "size-4 text-muted-foreground" : "size-4 text-emerald-600 dark:text-emerald-400"} aria-hidden="true" />,
          title: entry.title,
          placeholder: thumbnailIcon(Icon),
          onClick: entry.kind === "invoice" ? (invoiceHref ? () => open(entry) : undefined) : undefined,
          ariaLabel: `Open ${entry.title}`,
          menuLabel: `Options for ${entry.title}`,
        }
      }}
      date={(entry) => entry.kind === "creator" ? entry.person.updatedAt ?? entry.person.createdAt : entry.invoice.updatedAt ?? entry.invoice.createdAt}
      itemActions={(entry) => entry.kind === "creator"
        ? {
          noun: "creator",
          name: entry.title,
          extra: canEdit ? <DropdownMenuItem onSelect={() => open(entry)}>{entry.person.paid ? "Mark as not paid" : "Mark as paid"}</DropdownMenuItem> : undefined,
        }
        : { noun: "invoice", name: entry.title, onOpen: invoiceHref ? () => open(entry) : undefined }}
      // The amount goes with the kind and status, so the right side is always the date.
      row={(entry) => ({ subtitle: `${entry.kind === "creator" ? "Creator" : "Invoice"} · ${entry.status} · ${entry.amount}` })}
    />
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-1">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tabular-nums tracking-[-0.02em] text-foreground sm:text-lg">{value}</p>
    </div>
  )
}
