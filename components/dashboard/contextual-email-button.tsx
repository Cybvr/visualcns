"use client"

import Link from "next/link"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildEmailComposeHref, type EmailComposeContext } from "@/lib/email-composer"
import { cn } from "@/lib/utils"

type ContextualEmailButtonProps = {
  context: EmailComposeContext
  label: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  icon?: boolean
}

export function ContextualEmailButton({ context, label, variant = "outline", size = "sm", className, icon = true }: ContextualEmailButtonProps) {
  return (
    <Button asChild variant={variant} size={size} className={cn(className)} aria-label={label} title={label}>
      <Link href={buildEmailComposeHref(context)}>
        <Send className="size-4" aria-hidden="true" />
        <span className={!icon ? "sr-only" : undefined}>{label}</span>
      </Link>
    </Button>
  )
}
