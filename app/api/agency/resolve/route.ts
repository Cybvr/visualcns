import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const subdomain = request.headers.get("x-agency-subdomain")?.trim().toLowerCase()
  if (!subdomain) return NextResponse.json({ agency: null })
  const { db } = adminServices()
  const snapshot = await db.collection("agencies").where("subdomain", "==", subdomain).limit(1).get()
  if (snapshot.empty) return NextResponse.json({ agency: null }, { status: 404 })
  const item = snapshot.docs[0]
  const data = item.data()
  return NextResponse.json({ agency: { id: item.id, name: data.name || item.id, logoUrl: data.logoUrl || "", primaryColor: data.primaryColor || "", accentColor: data.accentColor || "" } })
}
