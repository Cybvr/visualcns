"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2, TicketPercent } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatMoney } from "@/lib/cart"

type Code = { code: string; percent: number; amountNGN: number; amountUSD: number; active: boolean; expiresAt: number | null; maxUses: number | null; uses: number }

function worth(code: Code) {
  if (code.percent) return `${code.percent}% off`
  return [code.amountNGN ? formatMoney(code.amountNGN, "NGN") : "", code.amountUSD ? formatMoney(code.amountUSD, "USD") : ""].filter(Boolean).join(" or ") + " off"
}

function status(code: Code) {
  if (!code.active) return "Off"
  if (code.expiresAt && code.expiresAt < Date.now()) return "Expired"
  if (code.maxUses !== null && code.uses >= code.maxUses) return "Used up"
  return "On"
}

const EMPTY = { code: "", kind: "percent" as "percent" | "amount", percent: "", amountNGN: "", amountUSD: "", expires: "", maxUses: "" }

/** Discount codes for the services checkout. Platform admins only. */
export default function DiscountCodesPage() {
  const { user, role, loading } = useAuth()
  const [codes, setCodes] = useState<Code[]>([])
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(EMPTY)

  async function call(method: string, body?: Record<string, unknown>) {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch("/api/admin/discount-codes", {
      method,
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = (await response.json().catch(() => ({}))) as Record<string, any>
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.")
    return data
  }

  async function load() {
    if (!user || role !== "superadmin") return
    setBusy(true)
    setError("")
    try {
      setCodes((await call("GET")).codes || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load the codes.")
    } finally {
      setBusy(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [user, role])

  const update = (key: keyof typeof EMPTY, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await call("POST", {
        code: form.code,
        ...(form.kind === "percent" ? { percent: Number(form.percent) } : { amountNGN: Number(form.amountNGN), amountUSD: Number(form.amountUSD) }),
        // The end of the chosen day, in the admin's own time.
        ...(form.expires ? { expiresAt: new Date(`${form.expires}T23:59:59`).getTime() } : {}),
        ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}),
      })
      toast.success(`${form.code.trim().toUpperCase()} added`)
      setForm(EMPTY)
      await load()
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Couldn't add the code.")
    } finally {
      setSaving(false)
    }
  }

  async function act(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
    try {
      await call(method, body)
      await load()
    } catch (actError) {
      toast.error(actError instanceof Error ? actError.message : "Something went wrong.")
    }
  }

  if (loading || (busy && role === "superadmin")) return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><h1 className="mt-7 text-xl font-semibold">Discount codes</h1><div className="mt-6"><MobileCardsSkeleton rows={4} /></div></main>
  if (role !== "superadmin") return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><p className="mt-6 text-sm text-muted-foreground">This area is restricted to platform operations.</p></main>

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <AccountNav />
      <h1 className="mt-7 text-xl font-semibold">Discount codes</h1>
      <p className="mt-1 text-sm text-muted-foreground">Codes buyers can enter at the services checkout.</p>

      <form onSubmit={create} className="mt-6 grid gap-4 rounded-2xl bg-muted/50 p-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="discount-code">Code</Label>
          <Input id="discount-code" value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} placeholder="LAUNCH20" maxLength={40} required className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discount-kind">Type</Label>
          <Select value={form.kind} onValueChange={(value) => update("kind", value)}>
            <SelectTrigger id="discount-kind" className="w-full bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentage off</SelectItem>
              <SelectItem value="amount">Fixed amount off</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.kind === "percent" ? (
          <div className="space-y-1.5">
            <Label htmlFor="discount-percent">Percent off</Label>
            <Input id="discount-percent" type="number" min={1} max={100} value={form.percent} onChange={(event) => update("percent", event.target.value)} required className="bg-background" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="discount-ngn">Naira off</Label>
              <Input id="discount-ngn" type="number" min={1} value={form.amountNGN} onChange={(event) => update("amountNGN", event.target.value)} placeholder="Leave empty for dollars only" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount-usd">Dollars off</Label>
              <Input id="discount-usd" type="number" min={1} value={form.amountUSD} onChange={(event) => update("amountUSD", event.target.value)} placeholder="Leave empty for Naira only" className="bg-background" />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="discount-expires">Ends</Label>
          <Input id="discount-expires" type="date" value={form.expires} onChange={(event) => update("expires", event.target.value)} className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discount-max">Use limit</Label>
          <Input id="discount-max" type="number" min={1} value={form.maxUses} onChange={(event) => update("maxUses", event.target.value)} placeholder="No limit" className="bg-background" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Add code</Button>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 space-y-2">
        {codes.map((code) => (
          <MobileDataCard
            key={code.code}
            surface="muted"
            iconShape="circle"
            icon={<span className="flex size-11 items-center justify-center rounded-full bg-background"><TicketPercent className="size-5 text-muted-foreground" aria-hidden="true" /></span>}
            title={code.code}
            subtitle={[
              worth(code),
              `${code.uses}${code.maxUses !== null ? ` of ${code.maxUses}` : ""} used`,
              code.expiresAt ? `ends ${new Date(code.expiresAt).toLocaleDateString()}` : "",
            ].filter(Boolean).join(" · ")}
            trailing={status(code)}
            menuLabel={`Options for ${code.code}`}
            actions={{
              noun: "code",
              name: code.code,
              extra: <DropdownMenuItem onSelect={() => void act("PATCH", { code: code.code, active: !code.active })}>{code.active ? "Turn off" : "Turn on"}</DropdownMenuItem>,
              onDelete: () => act("DELETE", { code: code.code }),
              deleteLabel: "Delete code",
            }}
          />
        ))}
        {!codes.length && !error && <p className="py-4 text-sm text-muted-foreground">No codes yet.</p>}
      </div>
    </main>
  )
}
