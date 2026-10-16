"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, MapPin, Plus } from "lucide-react"
import { toast } from "sonner"

import { CompanyDocuments } from "@/components/company/company-documents"
import { CompanyPlan, usePlanBilling, useSubscription } from "@/components/company/company-plan"
import { useCompanyPage } from "@/components/company/company-page-context"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/billing"
import { planAccess } from "@/lib/subscription"
import { cn } from "@/lib/utils"

// Titled the way the plan card titles itself ("CURRENT PLAN"), so the three cards read as a set.
function BillingCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <h3 className="surface-caption uppercase">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="surface-section-label">{title}</h2>
      <p className="surface-body mt-1">{description}</p>
    </div>
  )
}

// The same cards and rows as invoices on the Documents tab; opening one goes there.
function InvoiceHistory() {
  const { invoices, sectionHref } = useCompanyPage()
  const router = useRouter()

  return (
    <section>
      <SectionHeading title="Billing history" description="Invoices and receipts for this company." />
      <CompanyDocuments
        invoices={invoices}
        contracts={[]}
        estimates={[]}
        documents={[]}
        heading="Invoices"
        emptyDescription="Invoices will appear here when they are issued."
        onSelect={(kind, id) => router.push(sectionHref("documents", { doc: `${kind}:${id}` }))}
      />
    </section>
  )
}

export function CompanyBillings() {
  const { company, people } = useCompanyPage()
  const billing = useSubscription(company.id)
  const planBilling = usePlanBilling(company.id)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const access = planAccess(billing)
  const primaryContact = people.find((person) => person.id === company.primaryContactId) || people.find((person) => person.email || person.adminUser?.email)
  const contactEmail = primaryContact?.email || primaryContact?.adminUser?.email
  const contactName = primaryContact?.name || primaryContact?.adminUser?.displayName
  const nextPayment = billing?.nextPaymentAt?.toMillis?.()
  const nextPaymentDate = nextPayment ? formatDate(new Date(nextPayment).toISOString().slice(0, 10)) : "Not scheduled"
  const billingState = access.state === "trial" ? "Free trial" : access.state === "active" ? "Active" : access.state === "grace" ? "Payment attention needed" : "Paused"

  async function managePaymentMethod() {
    if (!billing?.subscriptionCode) {
      document.getElementById("billing-plans")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    setPaymentBusy(true)
    try {
      const { url } = await planBilling("manage")
      if (url) window.location.assign(url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "We couldn't open payment settings.")
    } finally {
      setPaymentBusy(false)
    }
  }

  return (
    <div className="mt-5 space-y-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <section className="min-w-0 rounded-2xl border border-border bg-card p-5">
          <CompanyPlan companyId={company.id} billing={billing} seats={people.length} expanded showPlans={false} className="border-0 p-0" />
        </section>
        <div className="grid content-start gap-4">
          <BillingCard title="Payment method">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="surface-caption uppercase">Status</p><p className="surface-body mt-1 font-medium text-foreground">{billingState}</p></div>
              <div><p className="surface-caption uppercase">Next charge</p><p className="surface-body mt-1 font-medium text-foreground">{nextPaymentDate}</p></div>
            </div>
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => void managePaymentMethod()} disabled={paymentBusy}>
              {billing?.subscriptionCode ? <CreditCard className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              {billing?.subscriptionCode ? "Manage payment method" : "Add payment method"}
            </Button>
          </BillingCard>
          <BillingCard title="Billing details">
            <div className="space-y-1">
              <p className="surface-body font-medium text-foreground">{company.name}</p>
              {contactName && <p className="surface-body">{contactName}</p>}
              {contactEmail && <p className="surface-body">{contactEmail}</p>}
            </div>
            {(company.address || company.location) && (
              <p className="surface-body mt-3 flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {company.address || company.location}
              </p>
            )}
          </BillingCard>
        </div>
      </div>

      <section id="billing-plans">
        <SectionHeading title="Plans" description="Upgrade or downgrade any time. Changes take effect on your next charge." />
        {/* The plan options are cards already, so they sit on the page rather than inside another card. */}
        <CompanyPlan companyId={company.id} billing={billing} seats={people.length} expanded showSummary={false} className="border-0 p-0" />
      </section>

      <InvoiceHistory />
    </div>
  )
}
