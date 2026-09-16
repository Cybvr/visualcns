"use client"

import { List, Plus, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ContactList, EmailContact } from "./types"

export type EmailListsProps = {
  lists: ContactList[]
  visibleLists: ContactList[]
  editingListId: string | null
  editList: (list: ContactList) => void
  deleteList: (id: string) => void
  resetListEditor: () => void
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
  contactInitials: (name: string, email: string) => string
  contactAvatarTone: (value: string) => string
}

export function EmailLists({
  lists,
  visibleLists,
  editingListId,
  editList,
  deleteList,
  resetListEditor,
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
  contactInitials,
  contactAvatarTone,
}: EmailListsProps) {
  return (
    <section className="grid min-h-0 w-full min-w-0 max-w-full flex-1 gap-4 overflow-visible pt-2 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden" role="tabpanel">
      <div className="min-h-0 overflow-visible rounded-[14px] border border-border bg-card lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-3 sm:px-4 sm:py-3.5">
          <h2 className="text-sm font-semibold">Contact lists <span className="font-normal tabular-nums text-muted-foreground">({lists.length})</span></h2>
          <Button type="button" variant="ghost" size="icon" onClick={resetListEditor} aria-label="New contact list" title="New contact list">
            <Plus aria-hidden="true" />
          </Button>
        </div>
        {visibleLists.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <List className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">No lists yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a list to group contacts for sending.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
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
        )}
      </div>

      <form onSubmit={saveList} className="min-h-0 rounded-[14px] border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">{editingListId ? "Edit list" : "New list"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the contacts you want to group together.</p>
          </div>
          {editingListId && <Button type="button" variant="ghost" size="sm" onClick={resetListEditor}>New</Button>}
        </div>

        <div className="mt-4 space-y-4">
          <Input value={listName} onChange={(event) => setListName(event.target.value)} maxLength={80} placeholder="List name" aria-label="List name" required />
          <div className="rounded-md border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Contacts</span>
              <button type="button" onClick={() => setListShowSelectedOnly((value) => !value)} className={cn("text-xs font-medium outline-none transition-colors hover:text-foreground", listShowSelectedOnly ? "text-foreground" : "text-muted-foreground")} aria-pressed={listShowSelectedOnly}>
                {listShowSelectedOnly ? "Show all" : `In list (${listContactEmails.length})`}
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">No client contacts available.</p>
            ) : (
              <>
                <div className="border-b border-border p-2">
                  <Input value={listContactQuery} onChange={(event) => setListContactQuery(event.target.value)} placeholder="Search contacts" aria-label="Search contacts" className="h-8 text-sm" />
                </div>
                <div className="max-h-72 overflow-y-auto">
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

        <div className="sticky bottom-0 z-10 mt-5 -mx-4 -mb-4 flex shrink-0 flex-col gap-3 border-t border-border bg-card px-4 pt-3 pb-4 sm:-mx-5 sm:-mb-5 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:static lg:mx-0 lg:mb-0 lg:bg-transparent lg:px-0 lg:pt-4">
          <div aria-live="polite" className="min-h-5 text-sm">{listNotice && <span className={listNotice.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{listNotice.text}</span>}</div>
          <Button type="submit">{editingListId ? "Save changes" : "Create list"}</Button>
        </div>
      </form>
    </section>
  )
}
