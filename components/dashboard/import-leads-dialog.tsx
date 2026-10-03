"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { Download, FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { importLeads } from "@/lib/leads"
import { parseLeadsCsv, parseLeadsMarkdown, parseLeadsSheet, type LeadCsvPreview } from "@/lib/leads-csv"
import { readXlsxRows } from "@/lib/xlsx-rows"

const MAX_FILE_BYTES = 2 * 1024 * 1024

export function ImportLeadsDialog({
  open,
  onOpenChange,
  uid,
  existingEmails,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  uid: string
  existingEmails: string[]
}) {
  const [fileName, setFileName] = useState("")
  const [preview, setPreview] = useState<LeadCsvPreview | null>(null)
  const [error, setError] = useState("")
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (open) return
    setFileName("")
    setPreview(null)
    setError("")
    setReading(false)
  }, [open])

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setPreview(null)
    setError("")
    setFileName(file?.name ?? "")
    if (!file) return
    const name = file.name.toLowerCase()
    if (name.endsWith(".xls")) {
      setError("Old .xls files can't be read. In Excel, save it as .xlsx or CSV and try again.")
      return
    }
    if (!/\.(csv|md|markdown|xlsx)$/.test(name)) {
      setError("Choose a CSV, Excel (.xlsx) or Markdown (.md) file.")
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("This file is too large. Choose a file under 2 MB.")
      return
    }
    setReading(true)
    try {
      if (name.endsWith(".xlsx")) setPreview(parseLeadsSheet(await readXlsxRows(file), existingEmails))
      else if (/\.(md|markdown)$/.test(name)) setPreview(parseLeadsMarkdown(await file.text(), existingEmails))
      else setPreview(parseLeadsCsv(await file.text(), existingEmails))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't read this file. Check it and try again.")
    } finally {
      setReading(false)
    }
  }

  async function submit() {
    if (!preview?.leads.length || importing) return
    setImporting(true)
    setError("")
    try {
      await importLeads(uid, preview.leads)
      toast.success(`${preview.leads.length} ${preview.leads.length === 1 ? "lead" : "leads"} imported.`)
      onOpenChange(false)
    } catch {
      setError("Couldn't import these leads. Nothing was added. Try again.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !importing && onOpenChange(next)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>CSV, Excel or Markdown.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label htmlFor="leads-csv-file">File</Label>
            <Input
              id="leads-csv-file"
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.md,.markdown,text/markdown"
              onChange={chooseFile}
              disabled={importing}
              className="cursor-pointer file:cursor-pointer"
            />
            <Button asChild variant="link" size="sm" className="h-auto px-0">
              <a href="/leads-sample.csv" download="leads-sample.csv">
                <Download className="size-4" aria-hidden="true" />
                Download sample CSV
              </a>
            </Button>
          </div>

          {reading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Reading file…</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          {preview && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <p className="font-medium text-foreground">{preview.leads.length} ready to import</p>
                {preview.skipped.length > 0 && <p className="text-muted-foreground">{preview.skipped.length} skipped</p>}
              </div>

              {preview.leads.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Preview</h3>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {preview.leads.slice(0, 5).map((lead, index) => (
                      <li key={`${lead.email}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{lead.name}</span>
                          {(lead.company || lead.email) && <span className="block truncate text-xs text-muted-foreground">{[lead.company, lead.email].filter(Boolean).join(" · ")}</span>}
                        </span>
                        <span className="shrink-0 text-xs capitalize text-muted-foreground">{lead.stage}</span>
                      </li>
                    ))}
                  </ul>
                  {preview.leads.length > 5 && <p className="mt-2 text-xs text-muted-foreground">And {preview.leads.length - 5} more.</p>}
                </div>
              )}

              {preview.skipped.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">Skipped rows</p>
                  <ul className="space-y-1">
                    {preview.skipped.slice(0, 4).map((item) => <li key={item.row}>Row {item.row}: {item.reason}</li>)}
                  </ul>
                  {preview.skipped.length > 4 && <p className="mt-1">And {preview.skipped.length - 4} more.</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
          <Button type="button" onClick={() => void submit()} disabled={!preview?.leads.length || reading || importing}>
            {importing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileUp className="size-4" aria-hidden="true" />}
            {importing ? "Importing…" : preview?.leads.length ? `Import ${preview.leads.length} ${preview.leads.length === 1 ? "lead" : "leads"}` : "Import leads"}
          </Button>
        </DialogFooter>
        {fileName && <p className="sr-only">Selected file: {fileName}</p>}
      </DialogContent>
    </Dialog>
  )
}
