"use client"

import { ArrowLeft, Eye, FileText, Linkedin, Plus, Twitter } from "lucide-react"

import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { BusinessProfile } from "@/lib/business-profile"
import { EmailListHeader, EmailListRow } from "./email-list-row"
import type { EmailTemplate } from "./types"

export type EmailTemplatesProps = {
  templates: EmailTemplate[]
  visibleTemplates: EmailTemplate[]
  editingTemplateId: string | null
  templateName: string
  setTemplateName: (value: string) => void
  templateSubject: string
  setTemplateSubject: (value: string) => void
  templateBody: string
  setTemplateBody: (value: string) => void
  templateNotice: { tone: "success" | "error"; text: string } | null
  saveTemplate: (event: React.FormEvent<HTMLFormElement>) => void
  useEditingTemplate: () => void
  previewEditingTemplate: () => void
  editTemplate: (template: EmailTemplate) => void
  setMobileTemplateView: (view: "list" | "editor") => void
  mobileTemplateView: "list" | "editor"
  businessProfile: BusinessProfile | null
  isAdmin: boolean
  addInsightsTemplate: () => void
  resetTemplateEditor: () => void
  deleteTemplate: (id: string) => void
  contactInitials: (name: string, email: string) => string
  contactAvatarTone: (value: string) => string
  formatListDate: (value: string) => string
}

export function EmailTemplates({
  templates,
  visibleTemplates,
  editingTemplateId,
  templateName,
  setTemplateName,
  templateSubject,
  setTemplateSubject,
  templateBody,
  setTemplateBody,
  templateNotice,
  saveTemplate,
  useEditingTemplate,
  previewEditingTemplate,
  editTemplate,
  setMobileTemplateView,
  mobileTemplateView,
  businessProfile,
  isAdmin,
  addInsightsTemplate,
  resetTemplateEditor,
  deleteTemplate,
  contactInitials,
  contactAvatarTone,
  formatListDate,
}: EmailTemplatesProps) {
  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6 lg:overflow-hidden" role="tabpanel">
      <form onSubmit={saveTemplate} className={cn("min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden", mobileTemplateView === "editor" ? "flex" : "hidden")}>
        <div className="mb-1 flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => setMobileTemplateView("list")} aria-label="Back to templates"><ArrowLeft aria-hidden="true" /></Button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{editingTemplateId ? "Edit" : "New template"}</p></div>
        </div>
        <div className="flex min-w-0 flex-none flex-col gap-3 lg:min-h-0 lg:flex-1">
          <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Input id="template-name" aria-label="Template name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} placeholder="Template name" required />
            <Input id="template-subject" aria-label="Subject" value={templateSubject} onChange={(event) => setTemplateSubject(event.target.value)} maxLength={200} placeholder="Subject" required />
          </div>
          <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2">
            <RichTextEditor value={templateBody} onChange={setTemplateBody} placeholder="Write the reusable message" scrollable allowHtml className="min-h-64 min-w-0 max-w-full lg:min-h-0 lg:flex-1" contentHeader={(
              <div className="bg-white px-4 py-5 sm:px-6"><img src="/visualcns-email-logo.png" alt={businessProfile?.name || "VisualCNS"} className="h-auto w-56 max-w-full object-contain object-left" /></div>
            )} contentFooter={(
              <div className="flex items-start justify-between gap-4 border-t border-border bg-neutral-50 px-4 py-4 text-xs leading-5 text-neutral-500 sm:px-6">
                <div className="min-w-0 text-left"><p className="font-semibold text-neutral-700">{businessProfile?.name || "VisualCNS"}</p><p>{businessProfile?.address || "Lagos, Nigeria"}</p><a href={businessProfile?.website?.startsWith("http") ? businessProfile.website : `https://${businessProfile?.website || "visualcns.com"}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">{businessProfile?.website || "visualcns.com"}</a></div>
                <div className="flex shrink-0 items-center gap-3 pt-0.5"><a href="https://x.com/visualcns" target="_blank" rel="noreferrer" aria-label="VisualCNS on X" className="text-neutral-700 hover:text-neutral-950"><Twitter className="size-3.5" aria-hidden="true" /></a><a href="https://www.linkedin.com/company/visualng" target="_blank" rel="noreferrer" aria-label="VisualCNS on LinkedIn" className="text-neutral-700 hover:text-neutral-950"><Linkedin className="size-3.5" aria-hidden="true" /></a></div>
              </div>
            )} />
          </div>
        </div>
        <div className="sticky bottom-0 z-10 mt-5 flex shrink-0 flex-col gap-3 border-t border-border bg-background pt-3 pb-4 sm:flex-row sm:items-center sm:justify-between lg:static lg:bg-transparent lg:pt-4 lg:pb-0">
          <div aria-live="polite" className="min-h-5 text-sm">{templateNotice && <span className={templateNotice.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{templateNotice.text}</span>}</div>
          <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={previewEditingTemplate} disabled={!templateBody.trim()}><Eye aria-hidden="true" />Preview</Button><Button type="button" variant="outline" onClick={useEditingTemplate} disabled={!editingTemplateId}>Use template</Button><Button type="submit">Save</Button></div>
        </div>
      </form>
      <div className={cn("min-h-0 w-full min-w-0 max-w-full max-lg:shrink-0 rounded-lg border border-border bg-card lg:flex-1 lg:overflow-y-auto", mobileTemplateView === "list" ? "block" : "hidden")}>
        <div className="flex items-center justify-end gap-2 border-b border-border p-2"><div className="flex items-center gap-1">{isAdmin && !templates.some((template) => template.id === "announce-insights") && <Button type="button" variant="outline" size="sm" onClick={addInsightsTemplate}>Add Insights email</Button>}<Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => { resetTemplateEditor(); setMobileTemplateView("editor") }} aria-label="New template" title="New template"><Plus aria-hidden="true" /></Button></div></div>
        {templates.length === 0 ? <div className="mt-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center"><FileText className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">No templates yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Save the first one using the editor.</p></div> : visibleTemplates.length === 0 ? <div className="mt-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No templates match your search.</div> : (
          <div><EmailListHeader primaryLabel="Template" dateLabel="Updated" />{visibleTemplates.map((template) => (
            <EmailListRow
              key={template.id}
              title={template.name}
              subject={template.subject}
              date={template.updatedAt}
              formattedDate={formatListDate(template.updatedAt)}
              avatarInitials={contactInitials(template.name, template.subject)}
              avatarTone={contactAvatarTone(template.name)}
              selected={editingTemplateId === template.id}
              onOpen={() => { editTemplate(template); setMobileTemplateView("editor") }}
              onDelete={() => deleteTemplate(template.id)}
              deleteLabel={`Delete ${template.name}`}
              ariaLabel={`Edit template ${template.name}`}
            />
          ))}</div>
        )}
      </div>
    </section>
  )
}
