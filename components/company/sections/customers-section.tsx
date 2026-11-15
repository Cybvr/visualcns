"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Contact } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  addCustomer,
  CUSTOMER_STATUSES,
  deleteCustomer,
  EMPTY_CUSTOMER,
  updateCustomer,
  watchCustomers,
  type Customer,
  type CustomerFields,
  type CustomerStatus,
} from "@/lib/customers"
import { cn } from "@/lib/utils"

function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      status === "customer" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    )}>
      {status === "customer" ? "Customer" : "Lead"}
    </span>
  )
}

const contactLine = (customer: Customer) => [customer.email, customer.phone].filter(Boolean).join(" · ")

/** The company's own leads and customers: add, edit, search and delete them. */
export function CustomersSection() {
  const { company } = useCompanyPage()
  const { user, appUser } = useAuth()
  const agencyId = company.agencyId || appUser?.agencyId || ""
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  // null: closed. "new": adding. Otherwise the customer being edited.
  const [editing, setEditing] = useState<Customer | "new" | null>(null)

  useEffect(() => {
    if (!user || !agencyId) return
    return watchCustomers(agencyId, company.id, setCustomers, (error) => {
      console.error("Couldn't load customers:", error)
      setCustomers([])
      toast.error("Couldn't load your customers.")
    })
  }, [agencyId, company.id, user])

  if (!user) return <p className="mt-9 text-center text-sm text-muted-foreground">Sign in to see your customers.</p>

  const add = <SectionAddButton label="Add customer" onClick={() => setEditing("new")} />

  return (
    <div className="mt-5">
      <h2 className="sr-only">Customers</h2>
      <CollectionView
        className="mt-4"
        items={customers ?? []}
        loading={customers === null}
        getKey={(customer) => customer.id}
        searchFields={(customer) => [customer.name, customer.email, customer.phone, customer.source, customer.status]}
        searchPlaceholder="Search customers"
        viewKey="company-customers"
        fixedView="list"
        actions={add}
        empty={{ icon: Contact, title: "No customers yet", description: "Add the people who buy from you or have asked about your business.", action: add }}
        date={(customer) => customer.createdAt}
        itemActions={(customer) => ({
          noun: "customer",
          name: customer.name,
          onDelete: () => deleteCustomer(customer.id),
          deleteMessage: `${customer.name} will be removed from your customers.`,
        })}
        card={(customer) => ({
          title: customer.name,
          icon: <Contact className="size-4 text-muted-foreground" aria-hidden="true" />,
          placeholder: <Contact className="size-8 text-muted-foreground/60" aria-hidden="true" />,
          onClick: () => setEditing(customer),
          ariaLabel: `Open ${customer.name}`,
        })}
        row={(customer) => ({
          subtitle: contactLine(customer) || customer.source || undefined,
          trailing: <StatusBadge status={customer.status} />,
        })}
      />

      <CustomerDialog
        customer={editing}
        onOpenChange={(open) => { if (!open) setEditing(null) }}
        onSave={async (fields) => {
          if (editing === "new") await addCustomer({ agencyId, companyId: company.id, uid: user.uid }, fields)
          else if (editing) await updateCustomer(editing.id, fields)
          setEditing(null)
        }}
      />
    </div>
  )
}

function CustomerDialog({ customer, onOpenChange, onSave }: {
  customer: Customer | "new" | null
  onOpenChange: (open: boolean) => void
  onSave: (fields: CustomerFields) => Promise<void>
}) {
  const [fields, setFields] = useState<CustomerFields>(EMPTY_CUSTOMER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const isNew = customer === "new"

  useEffect(() => {
    if (!customer) return
    setFields(customer === "new" ? EMPTY_CUSTOMER : {
      name: customer.name, email: customer.email, phone: customer.phone, status: customer.status, source: customer.source, notes: customer.notes,
    })
    setError("")
  }, [customer])

  const set = <K extends keyof CustomerFields>(key: K, value: CustomerFields[K]) => setFields((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!fields.name.trim()) {
      setError("Enter a name.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(fields)
    } catch (caught) {
      console.error("Couldn't save customer:", caught)
      setError("Couldn't save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={customer !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isNew ? "Add customer" : "Edit customer"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Name</Label>
              <Input id="customer-name" autoFocus value={fields.name} onChange={(event) => set("name", event.target.value)} aria-invalid={Boolean(error)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer-email">Email</Label>
                <Input id="customer-email" type="email" value={fields.email} onChange={(event) => set("email", event.target.value)} autoCapitalize="none" spellCheck={false} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-phone">Phone</Label>
                <Input id="customer-phone" type="tel" value={fields.phone} onChange={(event) => set("phone", event.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer-status">Status</Label>
                <Select value={fields.status} onValueChange={(value) => set("status", value as CustomerStatus)}>
                  <SelectTrigger id="customer-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-source">Source</Label>
                <Input id="customer-source" value={fields.source} onChange={(event) => set("source", event.target.value)} placeholder="Instagram, Website, Referral" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-notes">Notes</Label>
              <Textarea id="customer-notes" value={fields.notes} onChange={(event) => set("notes", event.target.value)} rows={3} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : isNew ? "Add" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
