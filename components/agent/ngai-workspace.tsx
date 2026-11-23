"use client"

import { useCallback, useEffect, useState } from "react"

import { useAgent } from "@/components/agent/agent-context"
import { ArtifactTitleMenu } from "@/components/agent/artifact-title-menu"
import { DocumentPane, InvoicePane, type ArtifactInfo } from "@/components/agent/artifact-panes"
import { ArtifactWindowControls } from "@/components/agent/artifact-window-controls"
import { MobileNgaiButton, MobileNgaiClose, mobileChatClass } from "@/components/agent/mobile-ngai"
import { Ngai, NgaiConversation, NgaiHeader, NgaiOpenItemContext } from "@/components/agent/ngai"
import { DocumentArtifact, type ArtifactRef } from "@/components/dashboard/document-artifact"
import { useHideHeader, useHideMobileFooter } from "@/components/dashboard/page-title-context"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { deleteInvoice, updateInvoice } from "@/lib/billing"
import { updateCompanyDocument } from "@/lib/company-documents"
import { deleteNote, setNoteShared } from "@/lib/notes"
import { cn } from "@/lib/utils"

/** The address for the open item, so a refresh or a shared link lands back on it. */
function itemUrl(item: ArtifactRef) {
  const id = encodeURIComponent(item.id)
  if (item.kind === "document") return `/dashboard/documents?document=${id}`
  if (item.kind === "invoice") return `/dashboard/invoices/${id}`
  if (item.kind === "estimate") return `/dashboard/estimates/${id}/edit`
  return `/dashboard/contracts/${id}`
}

/**
 * Ngai, the one UI. With nothing open it is the chat. When the conversation brings up a
 * document, an invoice or another item, it opens right here: the chat moves to the left
 * and the item fills the right. Expand hides the chat; close puts the item away. Nothing
 * navigates; only the address updates, so a refresh comes back to the same place.
 */
export function NgaiWorkspace({ initial }: { initial?: ArtifactRef }) {
  const { setItemContext, activeConversationId } = useAgent()
  const [item, setItem] = useState<ArtifactRef | null>(initial ?? null)
  const [info, setInfo] = useState<ArtifactInfo>({ title: initial?.title ?? "", shareEnabled: false })
  const [expanded, setExpanded] = useState(false)
  const [mobileChat, setMobileChat] = useState(false)
  const [sharing, setSharing] = useState(false)
  // Moves when the title menu changes the item, so its editor reloads.
  const [revision, setRevision] = useState(0)

  useHideMobileFooter(true)
  useHideHeader(Boolean(item))

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
    window.history.replaceState(null, "", itemUrl(next))
  }, [])

  const close = useCallback(() => {
    setItem(null)
    setExpanded(false)
    setMobileChat(false)
    window.history.replaceState(null, "", activeConversationId ? `/dashboard/chat/${encodeURIComponent(activeConversationId)}` : "/dashboard")
  }, [activeConversationId])

  if (!item) {
    return (
      <NgaiOpenItemContext.Provider value={open}>
        <Ngai scope={{ kind: "app" }} className="sm:px-6" menuInSidebar />
      </NgaiOpenItemContext.Provider>
    )
  }

  const controls = <ArtifactWindowControls expanded={expanded} onToggleExpand={() => setExpanded((current) => !current)} onClose={close} />
  const isDocument = item.kind === "document"
  const isInvoice = item.kind === "invoice"
  const noun = item.kind

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

  const editable = isDocument || isInvoice

  return (
    <NgaiOpenItemContext.Provider value={open}>
      {/* The chat on the left, the item on the right, filling the dashboard card; each side scrolls on its own. */}
      <main className={cn(
        "w-full lg:grid lg:h-full lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden",
        expanded ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[20rem_minmax(0,1fr)]",
      )}>
        <aside className={cn("hidden min-h-0 flex-col overflow-hidden border-r border-border lg:flex", expanded && "lg:hidden", mobileChatClass(mobileChat))}>
          <NgaiHeader
            layout="panel"
            heading={<>
              <ArtifactTitleMenu
                title={itemTitle || "Untitled"}
                noun={noun}
                onRename={editable ? rename : undefined}
                onShare={editable ? () => setSharing(true) : undefined}
                onDelete={editable ? remove : undefined}
              />
              <MobileNgaiClose onClick={() => setMobileChat(false)} />
            </>}
          />
          <NgaiConversation layout="panel" onOpenArtifact={() => {}} activeArtifactId={item.id} minimalWelcome />
        </aside>
        {!mobileChat && <MobileNgaiButton onClick={() => setMobileChat(true)} />}

        <section className="flex min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          {isDocument ? (
            <DocumentPane key={`${item.id}-${revision}`} id={item.id} controls={controls} onInfo={setInfo} onShare={() => setSharing(true)} onDelete={() => void remove()} />
          ) : isInvoice ? (
            <InvoicePane key={item.id} id={item.id} revision={revision} controls={controls} onInfo={setInfo} onDeleted={close} />
          ) : (
            <DocumentArtifact key={item.id} artifact={item} canEdit onClose={close} className="h-full min-h-0" />
          )}
        </section>
      </main>

      {editable && (
        <ShareDialog
          showTrigger={false}
          open={sharing}
          onOpenChange={setSharing}
          path={isDocument ? `/share/documents/${encodeURIComponent(item.id)}` : `/share/invoices/${encodeURIComponent(item.id)}`}
          title={itemTitle || noun}
          access={{ enabled: info.shareEnabled, onEnabledChange: (enabled) => { void changeSharing(enabled) } }}
        />
      )}
    </NgaiOpenItemContext.Provider>
  )
}
