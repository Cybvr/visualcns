import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const subdomain = request.headers.get("x-tenant-subdomain")?.trim().toLowerCase()
  if (!subdomain) return NextResponse.json({ tenant: null })
  const { db } = adminServices()
  const snapshot = await db.collection("tenants").where("subdomain", "==", subdomain).limit(1).get()
  if (snapshot.empty) return NextResponse.json({ tenant: null }, { status: 404 })
  const item = snapshot.docs[0]
  const data = item.data()
  return NextResponse.json({ tenant: { id: item.id, name: data.name || item.id, logoUrl: data.logoUrl || "", primaryColor: data.primaryColor || "", accentColor: data.accentColor || "" } })
}
