"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"

import { formatPrice, type Currency } from "@/lib/plans"
import { templatePaymentHref, type Project } from "@/lib/projects"
import { ToolChip } from "@/components/offer-card"
import { ProjectCard, ProjectCover } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

/** A template plus the task names that make up its steps. */
export type TemplateCard = {
  project: Project
  steps: string[]
}

function templatePrice(project: Project, currency: Currency) {
  return formatPrice(project.price ? { amount: project.price, prefix: project.pricePrefix ?? "" } : "free", currency)
}

/**
 * The template grid and its detail dialog, shared by the public templates page
 * and the workspace. Cards are the same ProjectCard the dashboard grid uses.
 * `onUse` is what turns the dialog into something a signed-in client can act
 * on: without it the dialog only offers the buy button.
 */
export function TemplateGallery({
  templates,
  currency,
  onUse,
  applyingId = null,
  projectHref,
}: {
  templates: TemplateCard[]
  currency: Currency
  onUse?: (project: Project) => Promise<void>
  applyingId?: string | null
  /** Admin dashboard: open the source project instead of the customer template dialog. */
  projectHref?: (project: Project) => string
}) {
  const [openCard, setOpenCard] = useState<TemplateCard | null>(null)
  const project = openCard?.project
  const ctaLabel = project?.price ? "Get template" : "Use template"

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {templates.map((card) => (
          <ProjectCard
            key={card.project.id}
            project={card.project}
            subtitle={card.project.service || "Workflow"}
            href={projectHref?.(card.project)}
            onClick={projectHref ? undefined : () => setOpenCard(card)}
            footer={
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{templatePrice(card.project, currency)}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {card.steps.length} {card.steps.length === 1 ? "step" : "steps"}
                </span>
              </div>
            }
            menu={
              <>
                {projectHref ? (
                  <DropdownMenuItem asChild>
                    <Link href={projectHref(card.project)}>Open project</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setOpenCard(card)}>View details</DropdownMenuItem>
                )}
                {onUse && (
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      onUse(card.project)
                    }}
                    disabled={applyingId !== null}
                  >
                    Add to my agency
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <a href={templatePaymentHref(card.project)} target="_blank" rel="noopener noreferrer">
                    {card.project.price ? "Get template" : "Use template"}
                  </a>
                </DropdownMenuItem>
              </>
            }
          />
        ))}
      </div>

      <Dialog open={Boolean(openCard)} onOpenChange={(open) => !open && setOpenCard(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl gap-0 overflow-y-auto p-0 sm:overflow-hidden">
          {project && openCard && (
            <div className="grid sm:grid-cols-[minmax(180px,0.75fr)_1.25fr]">
              <div className="aspect-[4/3] sm:aspect-auto sm:h-full">
                <ProjectCover project={project} />
              </div>

              <div className="flex flex-col p-5 sm:max-h-[80vh] sm:overflow-y-auto">
                <DialogTitle className="text-2xl font-bold">{project.title}</DialogTitle>

                {project.summary && <p className="mt-2 text-sm leading-5 text-muted-foreground">{project.summary}</p>}

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{templatePrice(project, currency)}</span>
                  <span className="text-sm text-muted-foreground">{project.timeline || "One-off"}</span>
                </div>

                {project.tools && project.tools.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.tools.map((tool) => (
                      <ToolChip key={tool} tool={tool} />
                    ))}
                  </div>
                )}

                {openCard.steps.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-sm font-semibold">Steps</p>
                    <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      {openCard.steps.map((step) => (
                        <li key={step} className="flex gap-2">
                          <Check className="mt-0.5 size-4 flex-shrink-0 text-accent" />
                          <span className="text-sm text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 space-y-2">
                  <Button asChild className="w-full">
                    <a href={templatePaymentHref(project)} target="_blank" rel="noopener noreferrer">
                      {ctaLabel}
                    </a>
                  </Button>

                  {onUse && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={applyingId !== null}
                      onClick={async () => {
                        await onUse(project)
                        setOpenCard(null)
                      }}
                    >
                      {applyingId === project.id && <Loader2 className="animate-spin" aria-hidden="true" />}
                      {applyingId === project.id ? "Adding" : "Add to my agency"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
