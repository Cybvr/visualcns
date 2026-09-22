"use client"

import { ArrowLeft, List, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { cn } from "@/lib/utils"
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
      <div className="min-h-0 overflow-visible lg:overflow-y-auto lg:rounded-[14px] lg:border lg:border-border lg:bg-card">
        {visibleLists.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <List className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">No lists yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a list to group contacts for sending.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 sm:hidden">
              {visibleLists.map((list) => (
                <MobileDataCard
                  key={list.id}
                  title={list.name}
                  subtitle={`${list.contactEmails.length} contact${list.contactEmails.length === 1 ? "" : "s"}`}
                  icon={<List className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
                  onClick={() => editList(list)}
                  ariaLabel={`Open ${list.name}`}
                  menuLabel={`Options for ${list.name}`}
                  menu={<DropdownMenuItem variant="destructive" onSelect={() => deleteList(list.id)}>Delete list</DropdownMenuItem>}
                />
              ))}
            </div>
            <div className="hidden divide-y divide-border sm:block">
              {visibleLists.map((list) => (
                <div key={list.id} className={cn("flex items-start gap-2 px-3.5 py-3", editingListId === list.id && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                  <Avatar className={cn("size-10 shrink-0", contactAvatarTone(list.name), editingListId === list.id && "bg-sidebar-accent-foreground/10 text-sidebar-accent-foreground")} aria-hidden="true">
                    <AvatarFallback className="bg-transparent text-sm font-medium">{contactInitials(list.name, list.name)}</AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={() => editList(list)} className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="block truncate text-sm font-medium">{list.name}</span>
                    <span className={cn("mt-1 block text-xs text-muted-foreground", editingListId === list.id && "text-sidebar-accent-foreground/70")}>{list.contactEmails.length} contact{list.contactEmails.length === 1 ? "" : "s"}</span>
                  </button>
                  <button type="button" onClick={() => deleteList(list.id)} aria-label={`Delete ${list.name}`} className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
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
