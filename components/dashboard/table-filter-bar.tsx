"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { FilterBar, type FilterBarProps } from "@/components/dashboard/filter-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CreateAction = { label: string; disabled?: boolean } & (
  | { href: string; onClick?: never }
  | { href?: never; onClick: () => void }
)

export type TableFilterBarProps = FilterBarProps & {
  createAction?: CreateAction
}

/** Clients-style toolbar shared by dashboard lists and tables. */
export function TableFilterBar({ className, actions, createAction, ...props }: TableFilterBarProps) {
  const createButton = createAction && (
    createAction.href ? (
      <Button asChild variant="ghost" className="bg-transparent text-foreground hover:bg-transparent">
        <Link href={createAction.href} aria-label={createAction.label}>
          <Plus className="size-4" aria-hidden="true" />New
        </Link>
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        className="bg-transparent text-foreground hover:bg-transparent"
        aria-label={createAction.label}
        disabled={createAction.disabled}
        onClick={createAction.onClick}
      >
        <Plus className="size-4" aria-hidden="true" />New
      </Button>
    )
  )

  return (
    <FilterBar
      {...props}
      className={cn("mb-0 min-h-16 border-b border-border", className)}
      actions={actions || createButton ? <>{actions}{createButton}</> : undefined}
    />
  )
}
