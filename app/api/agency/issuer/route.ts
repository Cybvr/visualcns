import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const agencyId = request.nextUrl.searchParams.get("agencyId")?.trim() || ""
  if (!agencyId || agencyId.length > 128 || agencyId.includes("/")) {
    return NextResponse.json({ error: "Invalid agency" }, { status: 400 })
  }

  const { db } = adminServices()
  const owner = await db.collection("organizations")
    .where("agencyId", "==", agencyId)
    .where("isOwner", "==", true)
    .limit(1)
    .get()
  if (owner.empty) return NextResponse.json({ error: "Agency profile unavailable" }, { status: 404 })

  const data = owner.docs[0].data()
  const agency = (await db.collection("agencies").doc(agencyId).get()).data()
  return NextResponse.json({ profile: {
    name: agency?.name || data.name || "",
    logoUrl: agency?.logoUrl || data.logoUrl || "",
    address: data.address || "",
    email: data.email || "",
    phone: data.phone || "",
    website: data.website || "",
    taxNumber: data.taxNumber || "",
  } })
}
