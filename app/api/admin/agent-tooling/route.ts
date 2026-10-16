import { NextResponse } from "next/server"

import { AGENT_PROMPT_VERSION, AGENT_SKILLS, AGENT_TOOL_MANIFEST, AGENT_TOOLSET_VERSION } from "@/lib/agent/registry"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    if (user.role !== "admin" && user.role !== "superadmin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
    return NextResponse.json({ promptVersion: AGENT_PROMPT_VERSION, toolsetVersion: AGENT_TOOLSET_VERSION, tools: AGENT_TOOL_MANIFEST, skills: AGENT_SKILLS })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent tooling lookup failed." }, { status: 403 })
  }
}
