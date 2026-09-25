"use client"

import { UserForm } from "@/components/dashboard/user-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { UserRole } from "@/lib/users"

interface NewPersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fixedRole?: UserRole
  subjectNoun?: "user" | "client" | "company" | "contact"
  /** Set when creating a person for a company that already exists, instead of giving them their own workspace. */
  joinWorkspaceId?: string
  joinWorkspaceName?: string
  onSaved: (uid: string) => void | Promise<void>
}

/** Create-person modal. Mirrors NewProjectDialog: same zero-padding shell, form supplies its own spacing. */
export function NewPersonDialog({
  open,
  onOpenChange,
  fixedRole,
  subjectNoun = "user",
  joinWorkspaceId,
  joinWorkspaceName,
  onSaved,
}: NewPersonDialogProps) {
  const subjectLabel = joinWorkspaceId
    ? "person"
    : subjectNoun === "company"
      ? "company"
      : subjectNoun === "client"
        ? "client"
        : subjectNoun === "contact"
          ? "contact"
          : "user"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>New {subjectLabel}</DialogTitle>
          <DialogDescription>
            {joinWorkspaceId
              ? `Add someone to ${joinWorkspaceName || "this company"}.`
              : `Create a new ${subjectLabel}.`}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <UserForm
            key="new"
            user={null}
            fixedRole={fixedRole}
            subjectNoun={subjectNoun}
            workspaceId={joinWorkspaceId}
            workspaceName={joinWorkspaceName}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
