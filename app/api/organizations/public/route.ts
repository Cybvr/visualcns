import { NextRequest, NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || ""
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid company link." }, { status: 400 })
  }

  try {
    const { db } = adminServices()
    const subdomain = request.headers.get("x-agency-subdomain")?.trim().toLowerCase()
    let agencyId = ""
    if (subdomain) {
      const agency = await db.collection("agencies").where("subdomain", "==", subdomain).limit(1).get()
      if (agency.empty) return NextResponse.json({ error: "Company not found." }, { status: 404 })
      agencyId = agency.docs[0].id
    }

    const organizations = db.collection("organizations")
    const matches = await organizations.where("slug", "==", slug).get()
    const isPublicMatch = (item: FirebaseFirestore.DocumentSnapshot) => {
      const data = item.data()
      return Boolean(data && (!agencyId || data.agencyId === agencyId)
        && (data.publicVisible === true || (data.isOwner === true && data.publicVisible !== false)))
    }
    let organization: FirebaseFirestore.DocumentSnapshot | undefined = matches.docs.find(isPublicMatch)
    if (!organization) {
      const legacy = await organizations.doc(slug).get()
      if (legacy.exists && isPublicMatch(legacy)) organization = legacy
    }
    if (!organization) return NextResponse.json({ error: "Company not found." }, { status: 404 })

    const data = organization.data()
    if (!data) return NextResponse.json({ error: "Company not found." }, { status: 404 })
    const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
    // This route supports public company pages without making the entire
    // organization document (including tax and payment details) world-readable.
    return NextResponse.json({ organization: {
      id: organization.id,
      agencyId: data.agencyId || "",
      name: data.name || "Company",
      slug: data.slug || slug,
      logoUrl: data.logoUrl || "",
      industry: data.industry || "",
      location: data.location || "",
      website: data.website || "",
      description: data.description || "",
      targetCustomers: data.targetCustomers || "",
      companySize: data.companySize || "",
      source: data.source || "",
      linkedIn: data.linkedIn || "",
      tags: strings(data.tags),
      media: strings(data.media),
      links: Array.isArray(data.links) ? data.links.filter((link: unknown) => link && typeof link === "object").map((link: { id?: string; label?: string; url?: string }) => ({
        id: link.id || "",
        label: link.label || "",
        url: link.url || "",
      })) : [],
      publicTeam: Array.isArray(data.publicTeam) ? data.publicTeam.filter((person: unknown) => person && typeof person === "object").map((person: { uid?: string; name?: string; role?: string; photoUrl?: string }) => ({
        uid: person.uid || "",
        name: person.name || "Team member",
        role: person.role || "",
        photoUrl: person.photoUrl || "",
      })) : [],
    } }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Company page could not be loaded." }, { status: 500 })
  }
}
