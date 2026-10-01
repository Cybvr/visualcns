import { NextRequest, NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const unavailable = () => NextResponse.json({ error: "Task not found." }, { status: 404 })

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId") || ""
  const taskId = request.nextUrl.searchParams.get("taskId") || ""
  if (!companyId || !taskId || companyId.includes("/") || taskId.includes("/")) return unavailable()

  try {
    const { db } = adminServices()
    const [company, sharedTask] = await Promise.all([
      db.collection("organizations").doc(companyId).get(),
      db.collection("portalTasks").doc(taskId).get(),
    ])
    const companyData = company.data()
    const sharedTaskData = sharedTask.data()
    if (!companyData || !sharedTaskData
      || !(companyData.publicVisible === true || (companyData.isOwner === true && companyData.publicVisible !== false))
      || sharedTaskData.companyId !== companyId
      || sharedTaskData.agencyId !== companyData.agencyId
      || typeof sharedTaskData.projectId !== "string") return unavailable()

    const [project, task] = await Promise.all([
      db.collection("portalProjects").doc(sharedTaskData.projectId).get(),
      db.collection("tasks").doc(taskId).get(),
    ])
    const projectData = project.data()
    const taskData = task.data()
    if (!projectData || !taskData
      || projectData.companyId !== companyId
      || projectData.agencyId !== companyData.agencyId
      || taskData.companyId !== companyId
      || taskData.projectId !== sharedTaskData.projectId
      || taskData.agencyId !== companyData.agencyId) return unavailable()

    return NextResponse.json({ content: typeof taskData.content === "string" ? taskData.content : "" }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "Task details could not be loaded." }, { status: 500 })
  }
}
