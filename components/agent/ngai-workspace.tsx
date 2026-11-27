"use client"

import { useCallback, useEffect, useState } from "react"

import { useAgent } from "@/components/agent/agent-context"
import { ArtifactTitleMenu } from "@/components/agent/artifact-title-menu"
import { DocumentPane, InvoicePane, type ArtifactInfo } from "@/components/agent/artifact-panes"
import { ArtifactWindowControls } from "@/components/agent/artifact-window-controls"
import { NgaiConversation, NgaiHeader, NgaiOpenItemContext } from "@/components/agent/ngai"
import { DocumentArtifact, type ArtifactRef } from "@/components/dashboard/document-artifact"
import { useHideHeader, useHideMobileFooter } from "@/components/dashboard/page-title-context"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { deleteInvoice, updateInvoice } from "@/lib/billing"
import { updateCompanyDocument } from "@/lib/company-documents"
import { deleteNote, setNoteShared } from "@/lib/notes"
import { cn } from "@/lib/utils"

/** The chat's own address. The open item rides along as ?open=, so you stay on the chat. */
function chatUrl(conversationId: string, item?: ArtifactRef | null) {
  const base = conversationId ? `/admin/chat/${encodeURIComponent(conversationId)}` : "/admin"
  return item ? `${base}?open=${item.kind}:${encodeURIComponent(item.id)}` : base
}

/** The ?open= value back into an item. */
export function parseOpenParam(value: string | null): ArtifactRef | undefined {
  const [kind, id] = (value ?? "").split(":")
  if (!id || !["document", "invoice", "contract"].includes(kind)) return undefined
  return { kind: kind as ArtifactRef["kind"], id: decodeURIComponent(id) }
}

/**
 * Ngai, the one UI. The chat is always the same panel: its title and menu on top, the
 * messages, the composer. With nothing open it spans the page. When the conversation brings
 * up a document, an invoice or another item, the panel narrows to the left and the item
 * fills the right. Expand hides the chat; close puts the item away. Nothing navigates;
 * only the address updates, so a refresh comes back to the same place.
 */
export function NgaiWorkspace({ initial }: { initial?: ArtifactRef }) {
  const { setItemContext, activeConversationId, conversations, renameConversation, deleteConversations, reset } = useAgent()
  const [item, setItem] = useState<ArtifactRef | null>(initial ?? null)
  const [info, setInfo] = useState<ArtifactInfo>({ title: initial?.title ?? "", shareEnabled: false })
  const [expanded, setExpanded] = useState(false)
  const [mobileChat, setMobileChat] = useState(false)
  const [sharing, setSharing] = useState(false)
  // Moves when the title menu changes the item, so its editor reloads.
  const [revision, setRevision] = useState(0)

  useHideMobileFooter(true)
  useHideHeader(true)

  // The chat knows what is open beside it, so "this" and "here" mean that item.
  const itemTitle = info.title || item?.title || ""
  useEffect(() => {
    setItemContext(item && (item.kind === "document" || item.kind === "invoice") ? { kind: item.kind, id: item.id, title: itemTitle } : null)
  }, [item, itemTitle, setItemContext])
  useEffect(() => () => setItemContext(null), [setItemContext])

  const open = useCallback((next: ArtifactRef) => {
    setItem(next)
    setInfo({ title: next.title ?? "", shareEnabled: false })
    setExpanded(false)
    setMobileChat(false)
    window.history.replaceState(null, "", chatUrl(activeConversationId, next))
  }, [activeConversationId])

  const close = useCallback(() => {
    setItem(null)
    setExpanded(false)
    setMobileChat(false)
    window.history.replaceState(null, "", chatUrl(activeConversationId))
  }, [activeConversationId])

  const isDocument = item?.kind === "document"
  const isInvoice = item?.kind === "invoice"
  const editable = isDocument || isInvoice

  async function rename(title: string) {
    if (!item) return
    if (isDocument) await updateCompanyDocument(item.id, { title })
    if (isInvoice) await updateInvoice(item.id, { title })
    setInfo((current) => ({ ...current, title }))
    setRevision((value) => value + 1)
  }

  async function remove() {
    if (!item) return
    if (isDocument) await deleteNote(item.id)
    if (isInvoice) await deleteInvoice(item.id)
    close()
  }

  async function changeSharing(enabled: boolean) {
    if (!item) return
    if (isDocument) await setNoteShared(item.id, enabled)
    if (isInvoice) await updateInvoice(item.id, { shareEnabled: enabled })
    setInfo((current) => ({ ...current, shareEnabled: enabled }))
    setRevision((value) => value + 1)
  }

  // The panel's title: the open item, or else the chat itself.
  const chat = conversations.find((entry) => entry.id === activeConversationId && entry.messages.length > 0)
  const heading = item ? (
    <>
      <ArtifactTitleMenu
        title={itemTitle || "Untitled"}
        noun={item.kind}
        onRename={editable ? rename : undefined}
        onShare={editable ? () => setSharing(true) : undefined}
        onDelete={editable ? remove : undefined}
      />
    </>
  ) : (
    <ArtifactTitleMenu
      title={chat?.title || "New chat"}
      noun="chat"
      onRename={chat ? (title) => renameConversation(chat.id, title) : undefined}
      onDelete={chat ? async () => { await deleteConversations([chat.id]); reset(); window.history.replaceState(null, "", "/admin") } : undefined}
      deleteDescription={chat ? `"${chat.title}" and its messages will be removed for good. This cannot be undone.` : undefined}
    />
  )

  const controls = <ArtifactWindowControls expanded={expanded} onToggleExpand={() => setExpanded((current) => !current)} onClose={close} />

  return (
    <NgaiOpenItemContext.Provider value={open}>
      <main
        className={cn(
          // From under the header to the bottom of the screen; the panes scroll inside.
          "relative grid h-[calc(100dvh-var(--shell-header-h,0px))] w-full min-h-0 overflow-hidden md:h-[calc(100dvh-var(--shell-header-h,0px)-12px)]",
          item ? "grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]" : "grid-rows-[minmax(0,1fr)]",
          !item || expanded ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]",
        )}
      >
        {/* Phones and tablets: one at a time, switched here, so the chat is never out of sight. */}
        {item && (
          <div className="flex gap-1 border-b border-border p-2 lg:hidden" role="tablist" aria-label="Chat or item">
            {([["chat", "Ngai"], ["item", item.kind.charAt(0).toUpperCase() + item.kind.slice(1)]] as const).map(([key, label]) => {
              const active = key === "chat" ? mobileChat : !mobileChat
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMobileChat(key === "chat")}
                  className={cn("flex-1 rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-muted text-foreground" : "text-muted-foreground")}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
        {/* The chat panel: the same at any width. Beside an item it is the left column. */}
        <aside className={cn(
          "relative min-h-0 flex-col overflow-hidden",
          item ? cn("border-r border-border lg:flex", mobileChat ? "flex" : "hidden", expanded && "lg:hidden") : "flex",
        )}>
          <NgaiHeader layout="panel" heading={heading} />
          <NgaiConversation
            layout={item ? "panel" : "page"}
            onOpenArtifact={() => {}}
            activeArtifactId={item?.id}
            minimalWelcome={Boolean(item)}
          />
        </aside>

        {item && (
          <>
            <section className={cn("relative flex min-h-0 min-w-0 flex-col overflow-hidden", mobileChat && "max-lg:hidden")}>
              {isDocument ? (
                <DocumentPane key={`${item.id}-${revision}`} id={item.id} controls={controls} onInfo={setInfo} onShare={() => setSharing(true)} onDelete={() => void remove()} />
              ) : isInvoice ? (
                <InvoicePane key={item.id} id={item.id} revision={revision} controls={controls} onInfo={setInfo} onDeleted={close} />
              ) : (
                <DocumentArtifact key={item.id} artifact={item} canEdit onClose={close} className="h-full min-h-0" />
              )}
            </section>
          </>
        )}
      </main>

      {item && editable && (
        <ShareDialog
          showTrigger={false}
          open={sharing}
          onOpenChange={setSharing}
          path={isDocument ? `/share/documents/${encodeURIComponent(item.id)}` : `/share/invoices/${encodeURIComponent(item.id)}`}
          title={itemTitle || item.kind}
          access={{ enabled: info.shareEnabled, onEnabledChange: (enabled) => { void changeSharing(enabled) } }}
        />
      )}
    </NgaiOpenItemContext.Provider>
  )
}
