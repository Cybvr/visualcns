"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { useAgent } from "@/components/agent/agent-context"
import { ArtifactTitleMenu } from "@/components/agent/artifact-title-menu"
import { DocumentPane, InvoicePane, type ArtifactInfo } from "@/components/agent/artifact-panes"
import { ArtifactWindowControls } from "@/components/agent/artifact-window-controls"
import { MobileNgaiButton, MobileNgaiClose, mobileChatClass } from "@/components/agent/mobile-ngai"
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
  const base = conversationId ? `/dashboard/chat/${encodeURIComponent(conversationId)}` : "/dashboard"
  return item ? `${base}?open=${item.kind}:${encodeURIComponent(item.id)}` : base
}

/** The ?open= value back into an item. */
export function parseOpenParam(value: string | null): ArtifactRef | undefined {
  const [kind, id] = (value ?? "").split(":")
  if (!id || !["document", "invoice", "estimate", "contract"].includes(kind)) return undefined
  return { kind: kind as ArtifactRef["kind"], id: decodeURIComponent(id) }
}

/** Runs from where it starts to the bottom of the window, so the composer sits at the bottom edge. */
function useFitToWindow() {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const fit = () => {
      const top = element.getBoundingClientRect().top
      // On wider screens the dashboard card has a small margin below it.
      const below = window.innerWidth >= 768 ? 12 : 0
      element.style.height = `${Math.max(320, Math.floor(window.innerHeight - Math.max(0, top) - below))}px`
    }
    fit()
    const frame = requestAnimationFrame(fit)
    const observer = new ResizeObserver(fit)
    observer.observe(document.body)
    window.addEventListener("resize", fit)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", fit) }
  }, [])
  return ref
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
  const mainRef = useFitToWindow()

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
      <MobileNgaiClose onClick={() => setMobileChat(false)} />
    </>
  ) : (
    <ArtifactTitleMenu
      title={chat?.title || "New chat"}
      noun="chat"
      onRename={chat ? (title) => renameConversation(chat.id, title) : undefined}
      onDelete={chat ? async () => { await deleteConversations([chat.id]); reset(); window.history.replaceState(null, "", "/dashboard") } : undefined}
      deleteDescription={chat ? `"${chat.title}" and its messages will be removed for good. This cannot be undone.` : undefined}
    />
  )

  const controls = <ArtifactWindowControls expanded={expanded} onToggleExpand={() => setExpanded((current) => !current)} onClose={close} />

  return (
    <NgaiOpenItemContext.Provider value={open}>
      <main
        ref={mainRef}
        className={cn(
          "grid w-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden",
          !item || expanded ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]",
        )}
      >
        {/* The chat panel: the same at any width. Beside an item it is the left column. */}
        <aside className={cn(
          "min-h-0 flex-col overflow-hidden",
          item ? cn("hidden border-r border-border lg:flex", expanded && "lg:hidden", mobileChatClass(mobileChat)) : "flex",
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
            {!mobileChat && <MobileNgaiButton onClick={() => setMobileChat(true)} />}
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
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
