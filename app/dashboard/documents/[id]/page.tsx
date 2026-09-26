"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { CompanyDocumentView } from "@/components/dashboard/company-document-view"
import { ContextualEmailButton } from "@/components/dashboard/contextual-email-button"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getCompanyDocument, type CompanyDocument } from "@/lib/company-documents"
import { companyDocumentPath } from "@/lib/navigation"

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const [record, setRecord] = useState<CompanyDocument | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const adminView = isAdmin && !isImpersonating

  usePageTitle(record?.title ?? null, "/dashboard/documents")

  useEffect(() => {
    if (!id || !user || !appUser) return
    let active = true
    setLoading(true)
    Promise.all([getCompanyDocument(id), getBusinessProfile()])
      .then(([found, profile]) => {
        if (!active) return
        setIssuer(profile)
        if (!found) {
          setRecord(null)
          return
        }
        const visible = (isAdmin && !isImpersonating) || (found.companyId === appUser.companyId && found.status !== "draft")
        setRecord(visible ? found : null)
      })
      .catch((loadError) => {
        console.error("Error loading document:", loadError)
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [appUser, id, isAdmin, isImpersonating, user])

  if (!user) return null
  if (loading) return <DashboardPageSkeleton variant="detail" />

  if (failed || !record) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/dashboard/documents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Back to documents</Link>
        <p className="mt-12 text-sm text-muted-foreground">This document couldn&rsquo;t be found or you don&rsquo;t have access to it.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/documents" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Back to documents</Link>
        <div className="flex items-center gap-2">
          {adminView && (
            <Link
              href={`/dashboard/documents/${record.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="size-4" aria-hidden="true" />Edit
            </Link>
          )}
          {adminView && <ContextualEmailButton label="Send for review" context={{ companyId: record.companyId, companyName: record.client, projectId: record.projectId, projectName: record.project, documentType: "companyDocument", documentId: record.id, documentTitle: record.title, subject: `${record.title} is ready for review`, ctaText: "Review document", ctaUrl: companyDocumentPath(record.companyId, "document", record.id) }} />}
          <DocumentActions title={record.title} />
        </div>
      </div>

      <CompanyDocumentView document={record} issuer={issuer ?? undefined} />
    </main>
  )
}
