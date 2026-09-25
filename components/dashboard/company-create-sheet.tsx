"use client"

import type React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

import { ImageDropzone } from "@/components/image-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { findOrCreateCompany } from "@/lib/companies"
import { INDUSTRIES } from "@/lib/industries"

type FormState = {
  name: string
  logoUrl: string
  industry: string
  location: string
}

const EMPTY_FORM: FormState = {
  name: "",
  logoUrl: "",
  industry: "",
  location: "",
}

export function CompanyCreateSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (workspaceId: string) => void | Promise<void>
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function reset() {
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      // Reuse a company that already carries this name instead of making a
      // second one; the account starts with no contact, added from its page.
      const company = await findOrCreateCompany({
        name: form.name.trim(),
        logoUrl: form.logoUrl.trim(),
        industry: form.industry.trim(),
        location: form.location.trim(),
      })
      reset()
      await onSaved(company.id)
    } catch (err) {
      console.error("Error creating company:", err)
      setError(err instanceof Error ? err.message : "The company could not be created.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
          onClose()
        }
      }}
    >
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>New company</SheetTitle>
          <SheetDescription>Set up a company for a client.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <ImageDropzone label="Logo" value={form.logoUrl} onChange={(url) => set("logoUrl", url)} />
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Select value={form.industry} onValueChange={(value) => set("industry", value)}>
                  <SelectTrigger id="industry" className="w-full">
                    <SelectValue placeholder="Select an industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Lagos, Nigeria"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 border-t border-border p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create company
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
