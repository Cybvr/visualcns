"use client"

import { ArrowLeft, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { EmailFolderEmpty, EmailFolderList } from "./email-folder-list"
import { EmailListRow } from "./email-list-row"
import type { ContactList, EmailContact } from "./types"

export type EmailListsProps = {
  visibleLists: ContactList[]
  editingListId: string | null
  editList: (list: ContactList) => void
  deleteList: (id: string) => void
  contactInitials: (name: string, email: string) => string
  contactAvatarTone: (value: string) => string
}

export type EmailListPickerProps = {
  open: boolean
  onClose: () => void
  editingListId: string | null
  listName: string
  setListName: (value: string) => void
  listContactQuery: string
  setListContactQuery: (value: string) => void
  listShowSelectedOnly: boolean
  setListShowSelectedOnly: (value: boolean | ((current: boolean) => boolean)) => void
  listContactEmails: string[]
  setListContactEmails: (value: string[] | ((current: string[]) => string[])) => void
  contacts: EmailContact[]
  visibleListContacts: EmailContact[]
  saveList: (event: React.FormEvent<HTMLFormElement>) => void
  listNotice: { tone: "success" | "error"; text: string } | null
}

export function EmailLists({
  visibleLists,
  editingListId,
  editList,
  deleteList,
  contactInitials,
  contactAvatarTone,
}: EmailListsProps) {
  return (
    <section className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-visible" role="tabpanel">
      <div className="min-h-0 overflow-visible lg:overflow-y-auto">
        <EmailFolderList
          label={`${visibleLists.length} ${visibleLists.length === 1 ? "list" : "lists"}`}
          empty={visibleLists.length === 0 ? <EmailFolderEmpty icon={<List className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />} title="No lists yet" /> : undefined}
        >
          {visibleLists.map((list) => (
            <EmailListRow
              key={list.id}
              title={list.name}
              subject={`${list.contactEmails.length} contact${list.contactEmails.length === 1 ? "" : "s"}`}
              date={list.updatedAt}
              avatarInitials={contactInitials(list.name, list.name)}
              avatarTone={contactAvatarTone(list.name)}
              selected={editingListId === list.id}
              onOpen={() => editList(list)}
              onDelete={() => deleteList(list.id)}
              deleteLabel={`Delete ${list.name}`}
              ariaLabel={`Open ${list.name}`}
            />
          ))}
        </EmailFolderList>
      </div>
    </section>
  )
}

export function EmailListPicker({
  open,
  onClose,
  editingListId,
  listName,
  setListName,
  listContactQuery,
  setListContactQuery,
  listShowSelectedOnly,
  setListShowSelectedOnly,
  listContactEmails,
  setListContactEmails,
  contacts,
  visibleListContacts,
  saveList,
  listNotice,
}: EmailListPickerProps) {
  if (!open) return null

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 overflow-hidden" role="tabpanel">
      <form onSubmit={saveList} className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
        <div className="mb-1 flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Back to lists"><ArrowLeft aria-hidden="true" /></Button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{editingListId ? "Edit" : "New list"}</p></div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <Input value={listName} onChange={(event) => setListName(event.target.value)} maxLength={80} placeholder="List name" aria-label="List name" required />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <div className="flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Contacts</span>
                <button type="button" onClick={() => setListShowSelectedOnly((value) => !value)} className={cn("text-xs font-medium outline-none transition-colors hover:text-foreground", listShowSelectedOnly ? "text-foreground" : "text-muted-foreground")} aria-pressed={listShowSelectedOnly}>
                  {listShowSelectedOnly ? "Show all" : `In list (${listContactEmails.length})`}
                </button>
              </div>
              {contacts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">No client contacts available.</p>
              ) : (
                <>
                  <div className="shrink-0 border-b border-border p-2">
                    <Input value={listContactQuery} onChange={(event) => setListContactQuery(event.target.value)} placeholder="Search contacts" aria-label="Search contacts" className="h-8 text-sm" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {visibleListContacts.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground">{listShowSelectedOnly ? "No contacts in this list yet." : "No contacts match your search."}</p>
                    ) : (
                      visibleListContacts.map((contact) => (
                        <label key={contact.email} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                          <input type="checkbox" checked={listContactEmails.includes(contact.email)} onChange={(event) => setListContactEmails((current) => event.target.checked ? [...current, contact.email] : current.filter((email) => email !== contact.email))} className="size-4 accent-primary" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{contact.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 mt-5 flex shrink-0 flex-col gap-3 border-t border-border bg-background pt-3 pb-4 sm:flex-row sm:items-center sm:justify-between lg:static lg:bg-transparent lg:pt-4 lg:pb-0">
          <div aria-live="polite" className="min-h-5 text-sm">{listNotice && <span className={listNotice.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{listNotice.text}</span>}</div>
          <Button type="submit">{editingListId ? "Save changes" : "Create list"}</Button>
        </div>
      </form>
    </section>
  )
}
