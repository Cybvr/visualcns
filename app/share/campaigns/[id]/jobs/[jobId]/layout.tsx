import type { Metadata } from "next"
import type { ReactNode } from "react"

import { sharedJobMetadata } from "@/lib/server/page-metadata"

export async function generateMetadata({ params }: { params: Promise<{ id: string; jobId: string }> }): Promise<Metadata> {
  const { id, jobId } = await params
  return sharedJobMetadata(id, jobId)
}

export default function SharedJobLayout({ children }: { children: ReactNode }) {
  return children
}
