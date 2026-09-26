"use client"

import { useState } from "react"
import type { ComponentProps } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const WORK_TYPES = ["Design", "Strategy", "Marketing", "Animation"] as const

const BUDGET_RANGES: Record<"USD" | "NGN", string[]> = {
  USD: ["Under $1,000", "$1,000 – $5,000", "$5,000 – $10,000", "$10,000 – $25,000", "$25,000+"],
  NGN: ["Under ₦1M", "₦1M – ₦5M", "₦5M – ₦15M", "₦15M – ₦40M", "₦40M+"],
}

type BookNowModalProps = {
  triggerLabel?: string
  triggerSize?: NonNullable<ComponentProps<typeof Button>["size"]>
  triggerVariant?: NonNullable<ComponentProps<typeof Button>["variant"]>
  triggerClassName?: string
}

export function BookNowModal({
  triggerLabel = "Book now",
  triggerSize = "lg",
  triggerVariant = "default",
  triggerClassName,
}: BookNowModalProps = {}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [workTypes, setWorkTypes] = useState<string[]>([])
  const [currency, setCurrency] = useState<"USD" | "NGN">("USD")
  const [budget, setBudget] = useState("")
  const [message, setMessage] = useState("")

  function toggleWorkType(type: string) {
    setWorkTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    )
  }

  function resetForm() {
    setName("")
    setEmail("")
    setCompany("")
    setWorkTypes([])
    setCurrency("USD")
    setBudget("")
    setMessage("")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, workTypes, currency, budget, message }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        toast.error(data.error || "Something went wrong. Try again.")
        return
      }
      toast.success("Thanks — we'll be in touch shortly.")
      resetForm()
      setOpen(false)
    } catch {
      toast.error("Could not reach the server. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={triggerSize} variant={triggerVariant} className={triggerClassName}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book now</DialogTitle>
          <DialogDescription>Tell us a little about your project and we&apos;ll get back to you.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder="Company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <div className="grid gap-2">
            <span className="text-sm text-muted-foreground">What do you need?</span>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPES.map((type) => {
                const active = workTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleWorkType(type)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Budget</span>
              <div className="inline-flex rounded-full border border-border p-0.5 text-xs">
                {(["USD", "NGN"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setCurrency(option)
                      setBudget("")
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 font-medium transition-colors",
                      currency === option ? "bg-foreground text-background" : "text-muted-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger>
                <SelectValue placeholder="Select a budget range" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_RANGES[currency].map((range) => (
                  <SelectItem key={range} value={range}>
                    {range}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Anything else? (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By sending, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
              terms
            </a>
            .
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
