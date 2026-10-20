"use client"

import { useState } from "react"
import { ScanLine, Sparkles } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { useSubscription } from "@/components/company/company-plan"
import { useTeamSeats } from "@/components/company/team-seats"
import { UpgradeModal } from "@/components/company/upgrade-modal"
import { useLocalCurrency } from "@/components/use-local-currency"
import { useSidebar } from "@/components/ui/sidebar"
import { billingMoney, planAccess, planPrice } from "@/lib/subscription"
import { cn } from "@/lib/utils"

/** A tilted purple tile with an icon, floating over the card's glow. */
function Tile({ icon: Icon, className }: { icon: typeof Sparkles; className: string }) {
  return (
    <span className={cn("absolute grid size-7 place-items-center rounded-lg bg-violet-500 text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)] ring-1 ring-white/15", className)} aria-hidden="true">
      <Icon className="size-3.5" />
    </span>
  )
}

/**
 * The upgrade offer at the bottom of the company sidebar, for the people who
 * manage the team: a dark card with a purple glow, the starting price in the
 * visitor's money, and a button that opens the plans. Hidden once a plan is paid.
 */
export function UpgradeCard() {
  const { company, canManageTeam } = useCompanyPage()
  const { setOpenMobile } = useSidebar()
  const billing = useSubscription(company.id)
  const teamSeats = useTeamSeats(company.id, canManageTeam)
  const currency = useLocalCurrency()
  const [open, setOpen] = useState(false)

  const access = billing ? planAccess(billing) : null
  const paid = access?.state === "active" && billing?.status !== "cancelled"
  if (!canManageTeam || paid) return null

  const openPlans = () => { setOpenMobile(false); setOpen(true) }

  return (
    <>
      {/* Collapsed to icons, it's just the sparkle. */}
      <button
        type="button"
        onClick={openPlans}
        aria-label="Upgrade"
        title="Upgrade"
        className="mx-auto mb-2 hidden size-8 place-items-center rounded-lg bg-neutral-950 text-violet-300 outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:grid"
      >
        <Sparkles className="size-4" aria-hidden="true" />
      </button>

      <div className="relative m-2 overflow-hidden rounded-2xl bg-neutral-950 p-3 text-white group-data-[collapsible=icon]:hidden">
        <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.75)_0%,rgba(76,29,149,0.35)_45%,transparent_70%)]" aria-hidden="true" />
        <Tile icon={ScanLine} className="right-9 top-2 -rotate-12" />
        <Tile icon={Sparkles} className="right-2 top-4 rotate-12" />
        <div className="relative pr-16 text-sm font-semibold leading-snug text-white">Unlock Pass, Reports and Ngai</div>
        <div className="relative mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1 text-white">
            <span className="text-base font-bold tracking-tight">{billingMoney(planPrice("starter", "monthly", currency), currency)}</span>
            <span className="text-xs text-white/60">/mo</span>
          </div>
          <button
            type="button"
            onClick={openPlans}
            className="h-8 shrink-0 rounded-full bg-white px-4 text-sm font-semibold text-neutral-900 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Upgrade
          </button>
        </div>
      </div>

      <UpgradeModal open={open} onOpenChange={setOpen} companyId={company.id} companyName={company.name} billing={billing} seats={teamSeats.info?.seats ?? null} />
    </>
  )
}
