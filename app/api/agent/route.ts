import OpenAI from "openai"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth as getAdminAuth } from "firebase-admin/auth"
import { FieldPath, FieldValue, getFirestore as getAdminFirestore } from "firebase-admin/firestore"
import { getTenantSecret, recordTenantUsage } from "@/lib/server/tenant-secrets"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna"
const MAX_TOOL_ROUNDS = 12

type ChatMessage = { role: "user" | "assistant"; content: string; images?: string[] }
type Surface = "client_portal" | "agency_dashboard"
type AgentBody = { messages?: ChatMessage[]; firstName?: string; surface?: Surface }

function adminServices() {
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
  return { auth: getAdminAuth(app), db: getAdminFirestore(app) }
}

const DASHBOARD_PROMPT = `You are Ngai, the VisualCNS assistant and a friendly guide for a creative and marketing agency dashboard.

Talk like a normal person first. Answer what was asked in a sentence or two.

When the message implies making something the dashboard holds (a company, contact, project, task,
invoice, estimate, contract, document or file), follow your answer by creating a DRAFT, not by interviewing
the user:

1. Look up what you can with query_workspace. Never ask for an ID, a number, or anything you can
   read yourself.
2. Ask ONLY the 3 or 4 essentials that thing cannot exist without, in one collect_details call. For
   an invoice that is the client (use NGN unless another currency is clear); for a project the
   client and title; for a task the project and name. Everything else has a sensible default and is
   left for the editor. If the user gives a client name and enough context for a batch, look it up
   and proceed without asking for each title or description.
3. Call the creation tool straight away with those answers. Do not ask for confirmation, and do not
   ask for line items, dates, prices, terms or long text in chat.
4. Reply with one short line and a markdown link to the url the tool returned, so the user finishes
   the details on the real page. For example: Draft invoice INV-004 created for Acme.
   [Open it](/dashboard/invoices/abc/edit)

If the thing already exists, use update_record to change it in place. You can fill in line items,
scope, terms, dates, notes and status. Never say you can only create and not edit, and never make a
duplicate to work around it. When asked to populate or complete a draft, write sensible professional
content yourself and save it with update_record, leaving only real prices for the user unless they
told you the numbers.

When the user gives explicit counts or says "populate everything", treat it as one batch job. Create
exactly the requested number of each thing, even when that means several calls to the same creation
tool. Create projects before tasks, then attach tasks and billing documents to the projects you just
created. Create written documents with useful titles, summaries and editable HTML body content based
on the information in the user's message. Do not ask for individual names, document bodies, task
wording or invoice line items unless the user explicitly supplied them or they are genuinely required.
Use NGN when no currency is specified, leave prices at zero, and use today's date/default statuses.
After the batch finishes, give a concise completion summary with links to the created records.

You are forbidden from listing the fields you need as prose or bullets. If you are about to type
"please provide" or "I need the following", call collect_details instead.

Help users think through projects, tasks, briefs, marketing, email, and their files.
Be concise, warm, and practical.

You can read the workspace database with the query_workspace tool: companies, projects, tasks,
invoices, estimates, contracts, written company documents, uploaded files and users. Use it for every factual question about the
account, including counts, lists, totals and lookups. Never say you cannot see the data or tell the
user to go look somewhere in the dashboard without calling the tool first. The tool already applies
the caller's permissions, so just call it and answer from what it returns.

Creation tools are available for companies, projects, tasks, draft invoices, draft estimates, draft
contracts and written company documents.

You can search the live web with the web_search tool for public information the workspace does not
hold - company research, industry facts, news, contact details. Use it whenever the user asks about
something outside their own records or asks you to "look up" or "pull info from the internet". Prefer
query_workspace for their own account data, and web_search for anything external. Cite the sources
you used.

Pass looked-up clients and projects to collect_details as select options so the user picks a name
and never types an ID. The user's answers arrive as their next message; act on them immediately.
Never invent prices, dates or legal terms, just leave them out of the draft.`

const PORTAL_PROMPT = `You are Ngai, the VisualCNS client portal assistant for customers working with an agency.
Help customers understand their work with the agency and how to use the portal: their projects,
shared tasks, files and links, billing documents, and contacting their agency.
Be concise, warm, and practical.

You can read this customer's own records with the query_workspace tool: their company, projects,
tasks, invoices, estimates, contracts, written company documents and uploaded files. It is automatically restricted to their own
company, so use it freely for any factual question about their account, including counts, lists and
status. Never say you cannot see the data without calling the tool first. Never invent details.

You can also take three actions on the customer's behalf, and only these:
- complete_task: mark one of their assigned tasks done (or reopen it) when they say it's finished.
- accept_estimate: accept an estimate the agency shared, when they say to go ahead.
- submit_task_feedback: post a comment or question from them onto one of their tasks.
Find the id with query_workspace first, never ask the customer for it. Confirm briefly what you did
in one short line. You cannot change anything else - for other changes, tell them to ask their agency.

You can also search the live web with the web_search tool for public information - facts, news, or
research the portal does not hold. Use query_workspace for their own account data and web_search for
anything external, and cite the sources you used.`

const AGENT_TOOLS = [
  {
    type: "function",
    name: "query_workspace",
    description:
      "Read records from the workspace database to answer any factual question: counts, lists, lookups, totals, status. An agency admin reads every record; every other signed-in user is automatically restricted to their own company's records. Always use this instead of saying you cannot see the data.",
    parameters: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          enum: ["organizations", "projects", "tasks", "invoices", "estimates", "contracts", "companyDocuments", "documents", "users"],
          description:
            "Which records to read. organizations = client companies, projects = projects, tasks = tasks, invoices/estimates/contracts = billing documents, companyDocuments = written company documents, documents = uploaded/shared files, users = people.",
        },
        limit: { type: ["number", "null"], description: "Maximum records to return. Defaults to 100, capped at 300." },
      },
      required: ["collection"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "update_record",
    description:
      "Update an existing record in place: fill in line items, scope, terms, dates, notes, status, or any other field. Use this whenever the user asks you to populate, complete, fill in, fix or change something that already exists. Never create a duplicate for that. Find the id with query_workspace, or use the id a create tool just returned.",
    parameters: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          enum: ["organizations", "projects", "tasks", "invoices", "estimates", "contracts", "companyDocuments"],
        },
        id: { type: "string", description: "Document id of the record to update." },
        patchJson: {
          type: "string",
          description:
            'A JSON object of only the fields you are changing, as a string. Estimate line items are [{"description","amount","details"}]; invoice line items are [{"description","quantity","unitPrice","taxRate"}] with prices in minor units. Totals are recalculated for you.',
        },
      },
      required: ["collection", "id", "patchJson"],
    },
  },
  {
    type: "function",
    name: "collect_details",
    description:
      "Show the user an inline form to gather details you still need. Always use this instead of listing required fields as a bulleted list in your reply. Answer the user in your text first, then call this with only the fields that are still missing. Look up IDs yourself with query_workspace rather than asking for them.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short heading, e.g. 'New invoice'" },
        fields: {
          type: "array",
          description:
            "The questions to ask, in order. They are shown one at a time as a card in the chat, so write each label as the question itself, e.g. 'Which client is this for?'. Keep it to 3 or 4.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Short machine key, e.g. currency" },
              label: { type: "string", description: "Human label shown to the user" },
              type: {
                type: "string",
                enum: ["text", "textarea", "number", "date", "select"],
                description:
                  "Use select for anything with a known set of answers: client, project, currency, priority, status. Use text only when the answer is genuinely free-form, like a title.",
              },
              options: {
                type: ["array", "null"],
                items: { type: "string" },
                description:
                  "REQUIRED when type is select: the exact choices. Real client or project names from query_workspace, or NGN/USD/GBP/EUR for currency. Never leave this empty on a select.",
              },
              placeholder: { type: ["string", "null"] },
              required: { type: ["boolean", "null"] },
            },
            required: ["id", "label", "type"],
          },
        },
      },
      required: ["title", "fields"],
    },
  },
  {
    type: "function",
    name: "create_company",
    description: "Create a new client company in the agency workspace.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Company name" },
        email: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        website: { type: ["string", "null"] },
        industry: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_project",
    description: "Create a client project and publish its safe summary to that client's portal.",
    parameters: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        client: { type: "string" },
        title: { type: "string" },
        service: { type: "string" },
        dueDate: { type: ["string", "null"] },
        summary: { type: ["string", "null"] },
      },
      required: ["companyId", "client", "title"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_task",
    description: "Create a task for a client project and publish its safe fields to the portal.",
    parameters: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        client: { type: "string" },
        projectId: { type: "string" },
        project: { type: "string" },
        name: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        dueDate: { type: ["string", "null"] },
        content: { type: ["string", "null"] },
      },
      required: ["companyId", "client", "projectId", "project", "name"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_invoice",
    description: "Create a draft invoice. Amounts are minor currency units, so 125000 means 1,250.00.",
    parameters: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        client: { type: "string" },
        currency: { type: "string" },
        issuedOn: { type: "string" },
        dueOn: { type: "string" },
        projectId: { type: ["string", "null"] },
        project: { type: ["string", "null"] },
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              taxRate: { type: "number" },
            },
            required: ["description", "quantity", "unitPrice", "taxRate"],
            additionalProperties: false,
          },
        },
        notes: { type: ["string", "null"] },
      },
      required: ["companyId", "client"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_estimate",
    description: "Create a draft estimate. Line item amounts are minor currency units.",
    parameters: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        client: { type: "string" },
        title: { type: "string" },
        currency: { type: "string" },
        issuedOn: { type: "string" },
        validUntil: { type: ["string", "null"] },
        scope: { type: ["string", "null"] },
        terms: { type: ["string", "null"] },
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number" },
              details: { type: ["string", "null"] },
            },
            required: ["description", "amount"],
            additionalProperties: false,
          },
        },
      },
      required: ["companyId", "client", "title"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_contract",
    description: "Create a draft contract for a client.",
    parameters: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        client: { type: "string" },
        title: { type: "string" },
        body: { type: ["string", "null"] },
        projectId: { type: ["string", "null"] },
        project: { type: ["string", "null"] },
      },
      required: ["companyId", "client", "title"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_document",
    description: "Create a written company document as a draft. Use the user's project or website information to write a useful editable HTML body instead of leaving it empty.",
    parameters: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        client: { type: "string" },
        title: { type: "string" },
        kind: { type: "string", enum: ["proposal", "sow", "brief", "report", "other"] },
        projectId: { type: ["string", "null"] },
        project: { type: ["string", "null"] },
        summary: { type: ["string", "null"] },
        body: { type: ["string", "null"], description: "Editable HTML using headings, paragraphs, lists and blockquotes." },
      },
      required: ["companyId", "client", "title"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "complete_task",
    description:
      "Mark one of the client's shared tasks as done, or reopen it. Only works on a task shared with, and assigned to, this client.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Document id of the task, from query_workspace." },
        done: { type: ["boolean", "null"], description: "true to complete (default), false to reopen." },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "accept_estimate",
    description: "Accept an estimate the agency shared with the client. Only works on the client's own, non-draft estimate.",
    parameters: {
      type: "object",
      properties: {
        estimateId: { type: "string", description: "Document id of the estimate, from query_workspace." },
      },
      required: ["estimateId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "submit_task_feedback",
    description: "Post a feedback comment or question from the client on one of their shared tasks. The agency sees it against that task.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Document id of the task, from query_workspace." },
        message: { type: "string", description: "The client's feedback or question." },
      },
      required: ["taskId", "message"],
      additionalProperties: false,
    },
  },
] as const

/** Read-only lookups plus the few writes a client is allowed to make in the portal. */
const CLIENT_ACTION_TOOLS = ["complete_task", "accept_estimate", "submit_task_feedback"]
const PORTAL_TOOLS = AGENT_TOOLS.filter((tool) => tool.name === "query_workspace" || CLIENT_ACTION_TOOLS.includes(tool.name))

/** Separates the assistant's text from a trailing inline form spec. */
export const FORM_MARKER = "\n␞::ngai-form::"

const READABLE_COLLECTIONS = [
  "organizations",
  "projects",
  "tasks",
  "invoices",
  "estimates",
  "contracts",
  "companyDocuments",
  "documents",
  "users",
]

const UPDATABLE_COLLECTIONS = ["organizations", "projects", "tasks", "invoices", "estimates", "contracts", "companyDocuments"]

/** Where a record lives in the dashboard, so the agent can link straight to it. */
function recordUrl(collectionName: string, id: string) {
  if (collectionName === "invoices") return `/dashboard/invoices/${id}/edit`
  if (collectionName === "estimates") return `/dashboard/estimates/${id}/edit`
  if (collectionName === "contracts") return `/dashboard/contracts/${id}/edit`
  if (collectionName === "companyDocuments") return `/dashboard/documents/${id}/edit`
  if (collectionName === "organizations") return `/dashboard/companies/${id}`
  if (collectionName === "projects") return `/dashboard/projects/${id}`
  return "/dashboard/tasks"
}

/** Internal-only fields a client must never receive back through the agent. */
const CLIENT_HIDDEN_FIELDS: Record<string, string[]> = {
  tasks: ["content"],
  projects: ["earnings", "cost", "internalNotes", "description"],
  users: ["email", "phone"],
}

function safeRecord(collectionName: string, data: FirebaseFirestore.DocumentData, isAdmin: boolean) {
  if (isAdmin) return data
  const hidden = CLIENT_HIDDEN_FIELDS[collectionName]
  if (!hidden) return data
  const copy = { ...data }
  for (const field of hidden) delete copy[field]
  return copy
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function requireText(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${key}.`)
  return value.trim()
}

function optionalText(args: Record<string, unknown>, key: string): string {
  return typeof args[key] === "string" ? String(args[key]).trim() : ""
}

function numberValue(args: Record<string, unknown>, key: string, fallback = 0): number {
  const value = Number(args[key])
  return Number.isFinite(value) ? value : fallback
}

async function nextDocumentNumber(db: ReturnType<typeof getAdminFirestore>, collectionName: string, prefix: string, tenantId: string) {
  const snapshot = await db.collection(collectionName).where("tenantId", "==", tenantId).get()
  let highest = 0
  for (const item of snapshot.docs) {
    const value = String(item.data()[collectionName === "invoices" ? "invoiceNumber" : "estimateNumber"] || "")
    const match = new RegExp(`^${prefix}-(\\d+)$`, "i").exec(value)
    if (match) highest = Math.max(highest, Number.parseInt(match[1], 10))
  }
  return `${prefix}-${String(highest + 1).padStart(4, "0")}`
}

async function runAgentTool(name: string, rawArgs: string, uid: string) {
  const { db } = adminServices()
  const userSnapshot = await db.collection("users").doc(uid).get()
  const userData = userSnapshot.data()
  if (!userSnapshot.exists) {
    throw new Error("Your account is not ready for workspace tools.")
  }

  const isAdmin = userData?.role === "admin" || userData?.role === "superadmin"
  const isSuperAdmin = userData?.role === "superadmin"
  const tenantId = typeof userData?.tenantId === "string" && userData.tenantId ? userData.tenantId : "legacy-visualcns"

  if (name === "query_workspace") {
    const readArgs = JSON.parse(rawArgs) as Record<string, unknown>
    const collectionName = requireText(readArgs, "collection")
    if (!READABLE_COLLECTIONS.includes(collectionName)) {
      throw new Error(`"${collectionName}" is not a readable collection.`)
    }
    const limit = Math.min(Math.max(Number(readArgs.limit) || 100, 1), 300)

    // An admin reads the tenant collection. Everyone else is pinned to their own
    // company, so a client can ask about their own work and nothing else.
    let query: FirebaseFirestore.Query = db.collection(collectionName)
    if (!isSuperAdmin) query = query.where("tenantId", "==", tenantId)
    if (!isAdmin) {
      const companyId = typeof userData?.companyId === "string" ? userData.companyId : ""
      if (!companyId) throw new Error("Your account is not linked to a client workspace.")
      query =
        collectionName === "organizations"
          ? query.where(FieldPath.documentId(), "==", companyId)
          : query.where("companyId", "==", companyId)
    }

    const snapshot = await query.limit(limit).get()
    const records = snapshot.docs.map((item) => ({ id: item.id, ...safeRecord(collectionName, item.data(), isAdmin) }))
    return {
      type: "records",
      collection: collectionName,
      count: snapshot.size,
      scope: isAdmin ? "agency workspace" : "your company",
      records,
    }
  }

  // Actions a client is allowed to take on their own portal records. Ownership
  // is re-checked here against the caller's company (and, for tasks, their
  // assignment) - the model's word is never trusted for that.
  const callerCompanyId = typeof userData?.companyId === "string" ? userData.companyId : ""

  if (name === "complete_task") {
    const actionArgs = JSON.parse(rawArgs) as Record<string, unknown>
    const id = requireText(actionArgs, "taskId")
    const done = actionArgs.done !== false
    const portalRef = db.collection("portalTasks").doc(id)
    const taskRef = db.collection("tasks").doc(id)
    const [portalSnap, taskSnap] = await Promise.all([portalRef.get(), taskRef.get()])
    if (!portalSnap.exists) throw new Error("That task isn't shared with you.")
    const portal = portalSnap.data() as FirebaseFirestore.DocumentData
    if (!isAdmin) {
      if (portal.tenantId !== tenantId || portal.companyId !== callerCompanyId) throw new Error("You can only update your own tasks.")
      if (portal.assigneeUid && portal.assigneeUid !== uid) throw new Error("That task is assigned to someone else.")
    }
    const status = done ? "done" : "todo"
    const stamp = FieldValue.serverTimestamp()
    const batch = db.batch()
    batch.set(portalRef, { status, updatedAt: stamp }, { merge: true })
    if (taskSnap.exists) batch.set(taskRef, { status, updatedAt: stamp }, { merge: true })
    await batch.commit()
    return { type: "task_updated", id, status }
  }

  if (name === "accept_estimate") {
    const actionArgs = JSON.parse(rawArgs) as Record<string, unknown>
    const id = requireText(actionArgs, "estimateId")
    const ref = db.collection("estimates").doc(id)
    const snap = await ref.get()
    if (!snap.exists) throw new Error("That estimate no longer exists.")
    const estimate = snap.data() as FirebaseFirestore.DocumentData
    if (!isSuperAdmin && (estimate.tenantId !== tenantId || (!isAdmin && estimate.companyId !== callerCompanyId))) throw new Error("You can only accept your own estimates.")
    if (estimate.status === "draft") throw new Error("That estimate isn't available to accept yet.")
    await ref.set({ status: "accepted", acceptedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return { type: "estimate_accepted", id }
  }

  if (name === "submit_task_feedback") {
    const actionArgs = JSON.parse(rawArgs) as Record<string, unknown>
    const id = requireText(actionArgs, "taskId")
    const message = requireText(actionArgs, "message")
    const portalSnap = await db.collection("portalTasks").doc(id).get()
    if (!portalSnap.exists) throw new Error("That task isn't shared with you.")
    const portal = portalSnap.data() as FirebaseFirestore.DocumentData
    if (!isSuperAdmin && (portal.tenantId !== tenantId || (!isAdmin && portal.companyId !== callerCompanyId))) throw new Error("You can only comment on your own tasks.")
    await db.collection("portalComments").add({
      tenantId,
      companyId: portal.companyId ?? callerCompanyId,
      taskId: id,
      authorUid: uid,
      authorName: userData?.displayName || "Client",
      body: message,
      createdAt: FieldValue.serverTimestamp(),
    })
    return { type: "feedback_sent", taskId: id }
  }

  if (!isAdmin) {
    throw new Error("Only an agency admin can change workspace records.")
  }

  const args = JSON.parse(rawArgs) as Record<string, unknown>
  const now = FieldValue.serverTimestamp()

  if (name === "update_record") {
    const collectionName = requireText(args, "collection")
    if (!UPDATABLE_COLLECTIONS.includes(collectionName)) {
      throw new Error(`"${collectionName}" cannot be updated.`)
    }
    const id = requireText(args, "id")

    let patch: Record<string, unknown>
    try {
      patch = JSON.parse(requireText(args, "patchJson")) as Record<string, unknown>
    } catch {
      throw new Error("patchJson must be a valid JSON object.")
    }
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      throw new Error("patchJson must be a JSON object of fields to set.")
    }
    // Identity and audit fields are never rewritten from a patch.
    for (const key of ["id", "createdAt", "tenantId", "companyId", "invoiceNumber", "estimateNumber"]) delete patch[key]

    const ref = db.collection(collectionName).doc(id)
    const existing = await ref.get()
    if (!existing.exists) throw new Error("That record no longer exists.")
    if (!isSuperAdmin && existing.data()?.tenantId !== tenantId) throw new Error("That record belongs to another tenant.")

    // Recalculate money so stored totals always match the lines.
    if (Array.isArray(patch.lineItems)) {
      const rows = patch.lineItems as Record<string, unknown>[]
      if (collectionName === "invoices") {
        const items = rows.map((row, index) => ({
          id: `line-${Date.now()}-${index}`,
          description: requireText(row, "description"),
          quantity: numberValue(row, "quantity", 1),
          unitPrice: numberValue(row, "unitPrice"),
          taxRate: numberValue(row, "taxRate"),
        }))
        const subtotal = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice), 0)
        const taxTotal = items.reduce((sum, item) => sum + Math.round((item.quantity * item.unitPrice * item.taxRate) / 100), 0)
        Object.assign(patch, { lineItems: items, subtotal, taxTotal, amount: subtotal + taxTotal })
      }
      if (collectionName === "estimates") {
        const items = rows.map((row, index) => ({
          id: `line-${Date.now()}-${index}`,
          description: requireText(row, "description"),
          amount: numberValue(row, "amount"),
          ...(optionalText(row, "details") ? { details: optionalText(row, "details") } : {}),
        }))
        Object.assign(patch, { lineItems: items, amount: items.reduce((sum, item) => sum + item.amount, 0) })
      }
    }

    await ref.set({ ...patch, updatedAt: now }, { merge: true })

    // Keep the client-facing projections in step, safe fields only.
    const companyId = existing.data()?.companyId
    if (collectionName === "projects" && companyId) {
      const safe: Record<string, unknown> = {}
      for (const key of ["title", "status", "progress", "dueDate", "summary"]) {
        if (patch[key] !== undefined) safe[key] = patch[key]
      }
      if (Object.keys(safe).length) await db.collection("portalProjects").doc(id).set(safe, { merge: true })
    }
    if (collectionName === "tasks" && companyId) {
      const safe: Record<string, unknown> = {}
      for (const key of ["name", "status", "dueDate"]) {
        if (patch[key] !== undefined) safe[key] = patch[key]
      }
      if (Object.keys(safe).length) await db.collection("portalTasks").doc(id).set(safe, { merge: true })
    }

    return { type: "updated", collection: collectionName, id, fields: Object.keys(patch), url: recordUrl(collectionName, id) }
  }

  if (name === "create_company") {
    const name = requireText(args, "name")
    const ref = db.collection("organizations").doc()
    await ref.set({
      name,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company"}-${ref.id.slice(0, 6)}`,
      email: optionalText(args, "email"),
      phone: optionalText(args, "phone"),
      website: optionalText(args, "website"),
      industry: optionalText(args, "industry"),
      location: optionalText(args, "location"),
      description: optionalText(args, "description"),
      isOwner: false,
      tenantId,
      createdAt: now,
      updatedAt: now,
    })
    return { type: "company", id: ref.id, name, url: `/dashboard/companies/${ref.id}` }
  }

  if (name === "create_project") {
    const companyId = requireText(args, "companyId")
    const client = requireText(args, "client")
    const title = requireText(args, "title")
    const service = optionalText(args, "service")
    const ref = db.collection("projects").doc()
    const dueDate = optionalText(args, "dueDate")
    const summary = optionalText(args, "summary")
    await ref.set({ tenantId, companyId, client, title, service, status: "in-progress", progress: 0, dueDate, summary, isPublic: false, createdAt: now, updatedAt: now })
    await db.collection("portalProjects").doc(ref.id).set({ tenantId, companyId, title, status: "in-progress", progress: 0, dueDate, thumbnailUrl: "", summary, legacySlug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") })
    return { type: "project", id: ref.id, title, client, url: `/dashboard/projects/${ref.id}` }
  }

  if (name === "create_task") {
    const companyId = requireText(args, "companyId")
    const client = requireText(args, "client")
    const projectId = requireText(args, "projectId")
    const project = requireText(args, "project")
    const taskName = requireText(args, "name")
    const priority = optionalText(args, "priority") || "medium"
    if (!["low", "medium", "high"].includes(priority)) throw new Error("Priority must be low, medium, or high.")
    const ref = db.collection("tasks").doc()
    const dueDate = optionalText(args, "dueDate")
    const content = optionalText(args, "content")
    await ref.set({ tenantId, name: taskName, companyId, client, projectId, project, status: "todo", priority, dueDate, content, isPublic: false, createdAt: now, updatedAt: now })
    await db.collection("portalTasks").doc(ref.id).set({ tenantId, companyId, projectId, name: taskName, status: "todo", dueDate, instructions: content, assigneeUid: "" })
    return { type: "task", id: ref.id, name: taskName, project, url: `/dashboard/tasks` }
  }

  if (name === "create_invoice") {
    const companyId = requireText(args, "companyId")
    const client = requireText(args, "client")
    const lineItems = Array.isArray(args.lineItems) ? args.lineItems : []
    const items = lineItems.map((item, index) => {
      const row = item as Record<string, unknown>
      return { id: `line-${Date.now()}-${index}`, description: requireText(row, "description"), quantity: numberValue(row, "quantity", 1), unitPrice: numberValue(row, "unitPrice"), taxRate: numberValue(row, "taxRate") }
    })
    const subtotal = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice), 0)
    const taxTotal = items.reduce((sum, item) => sum + Math.round((item.quantity * item.unitPrice * item.taxRate) / 100), 0)
    const ref = db.collection("invoices").doc()
    const invoiceNumber = await nextDocumentNumber(db, "invoices", "INV", tenantId)
    const currency = optionalText(args, "currency") || "NGN"
    await ref.set({ tenantId, companyId, client, invoiceNumber, projectId: optionalText(args, "projectId"), project: optionalText(args, "project"), status: "draft", lineItems: items, subtotal, discountTotal: 0, taxTotal, amount: subtotal + taxTotal, currency, issuedOn: optionalText(args, "issuedOn") || today(), dueOn: optionalText(args, "dueOn"), notes: optionalText(args, "notes"), createdAt: now, updatedAt: now })
    return { type: "invoice", id: ref.id, number: invoiceNumber, amount: subtotal + taxTotal, currency, status: "draft", url: `/dashboard/invoices/${ref.id}/edit` }
  }

  if (name === "create_estimate") {
    const companyId = requireText(args, "companyId")
    const client = requireText(args, "client")
    const title = requireText(args, "title")
    const lineItems = Array.isArray(args.lineItems) ? args.lineItems : []
    const items = lineItems.map((item, index) => {
      const row = item as Record<string, unknown>
      return { id: `line-${Date.now()}-${index}`, description: requireText(row, "description"), amount: numberValue(row, "amount"), ...(optionalText(row, "details") ? { details: optionalText(row, "details") } : {}) }
    })
    const ref = db.collection("estimates").doc()
    const estimateNumber = await nextDocumentNumber(db, "estimates", "EST", tenantId)
    await ref.set({ tenantId, companyId, client, estimateNumber, title, projectId: optionalText(args, "projectId"), project: optionalText(args, "project"), status: "draft", lineItems: items, amount: items.reduce((sum, item) => sum + item.amount, 0), currency: optionalText(args, "currency") || "NGN", issuedOn: optionalText(args, "issuedOn") || today(), validUntil: optionalText(args, "validUntil"), scope: optionalText(args, "scope"), terms: optionalText(args, "terms"), createdAt: now, updatedAt: now })
    return { type: "estimate", id: ref.id, number: estimateNumber, title, status: "draft", url: `/dashboard/estimates/${ref.id}/edit` }
  }

  if (name === "create_contract") {
    const companyId = requireText(args, "companyId")
    const client = requireText(args, "client")
    const title = requireText(args, "title")
    const ref = db.collection("contracts").doc()
    await ref.set({ tenantId, companyId, client, title, body: optionalText(args, "body"), projectId: optionalText(args, "projectId"), project: optionalText(args, "project"), status: "draft", createdAt: now, updatedAt: now })
    return { type: "contract", id: ref.id, title, status: "draft", url: `/dashboard/contracts/${ref.id}/edit` }
  }

  if (name === "create_document") {
    const companyId = requireText(args, "companyId")
    const client = requireText(args, "client")
    const title = requireText(args, "title")
    const kind = optionalText(args, "kind") || "other"
    if (!["proposal", "sow", "brief", "report", "other"].includes(kind)) {
      throw new Error("Document type must be proposal, sow, brief, report, or other.")
    }
    const ref = db.collection("companyDocuments").doc()
    await ref.set({
      tenantId,
      companyId,
      client,
      title,
      kind,
      projectId: optionalText(args, "projectId"),
      project: optionalText(args, "project"),
      status: "draft",
      summary: optionalText(args, "summary"),
      body: optionalText(args, "body"),
      shareEnabled: false,
      createdAt: now,
      updatedAt: now,
    })
    return { type: "document", id: ref.id, title, status: "draft", url: `/dashboard/documents/${ref.id}/edit` }
  }

  throw new Error(`Unknown agent tool: ${name}`)
}

export async function POST(request: Request) {
  let body: AgentBody
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  const messages = (body.messages ?? []).filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      // A user turn can be just an image, so keep it when it carries attachments.
      (m.content.trim() || (m.role === "user" && Array.isArray(m.images) && m.images.length > 0)),
  )
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "No message to answer." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  const basePrompt = body.surface === "client_portal" ? PORTAL_PROMPT : DASHBOARD_PROMPT
  const systemInstruction = body.firstName
    ? `${basePrompt}\n\nThe person you are speaking with is called ${body.firstName}.`
    : basePrompt

  try {
    const authorization = request.headers.get("authorization") || ""
    let uid = ""
    let tenantId = "legacy-visualcns"
    if (authorization.startsWith("Bearer ")) {
      try {
        const services = adminServices()
        const decoded = await services.auth.verifyIdToken(authorization.slice(7))
        uid = decoded.uid
        const user = (await services.db.collection("users").doc(uid).get()).data() || {}
        if (typeof user.tenantId === "string" && user.tenantId) tenantId = user.tenantId
      } catch (error) {
        console.error("Agent token verification failed", error)
        return new Response(JSON.stringify({ error: "Ngai could not verify your signed-in account." }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      }
    }

    const apiKey = await getTenantSecret(tenantId, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || "")
    if (!apiKey) return new Response(JSON.stringify({ error: "The assistant is not configured yet." }), { status: 503, headers: { "content-type": "application/json" } })
    const client = new OpenAI({ apiKey })

    // A user turn with attachments becomes a content array of text + images, so
    // a vision-capable model can actually see what was shared. Plain turns stay
    // simple strings.
    const input = messages.map((message) => {
      const images = message.role === "user" && Array.isArray(message.images)
        ? message.images.filter((url): url is string => typeof url === "string" && /^https?:\/\//.test(url))
        : []
      if (!images.length) return { role: message.role, content: message.content }
      return {
        role: message.role,
        content: [
          ...(message.content.trim() ? [{ type: "input_text", text: message.content }] : []),
          ...images.map((url) => ({ type: "input_image", image_url: url })),
        ],
      }
    })
    // web_search is a hosted tool: OpenAI runs it and returns the results as a
    // web_search_call output item, so it never enters the function_call loop below.
    const baseTools = body.surface === "client_portal" ? PORTAL_TOOLS : AGENT_TOOLS
    const tools = [...baseTools, { type: "web_search" }] as any
    let response = await client.responses.create({
      model: MODEL,
      instructions: systemInstruction,
      input: input as any,
      tools,
    })

    const textResponse = (value: string) =>
      new Response(value, {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      })

    // Keep running tools until the model answers, asks for a form, or we hit the
    // ceiling. The form can arrive on any round, e.g. after a query_workspace
    // lookup, so it has to be checked every time and not just on the first.
    let turns = 0
    let conversation: any[] = [...input]
    for (;;) {
      const outputItems = response.output as Array<{ type: string; name?: string; arguments?: string; call_id?: string }>
      const toolCalls = outputItems.filter((item) => item.type === "function_call")

      // A form ends the turn: the UI renders it and the answers come back as the
      // user's next message, so there is nothing to execute server-side.
      const formCall = toolCalls.find((call) => call.name === "collect_details")
      if (formCall) {
        try {
          const form = JSON.parse(formCall.arguments || "{}")
          if (form?.fields?.length) {
            const text = response.output_text?.trim() || "Here's what I need."
            return textResponse(`${text}${FORM_MARKER}${JSON.stringify(form)}`)
          }
        } catch {
          // Fall through and let the model answer normally.
        }
      }

      if (!toolCalls.length || turns >= MAX_TOOL_ROUNDS) break

      const toolOutputs = []
      for (const call of toolCalls) {
        let result: unknown
        try {
          if (!uid) throw new Error("Please sign in before using workspace tools.")
          result = await runAgentTool(call.name || "", call.arguments || "{}", uid)
        } catch (error) {
          result = { error: error instanceof Error ? error.message : "That could not be completed." }
        }
        toolOutputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) })
      }

      conversation = [...conversation, ...response.output, ...toolOutputs]
      turns += 1
      response = await client.responses.create({
        model: MODEL,
        instructions: systemInstruction,
        input: conversation as any,
        tools,
      })
    }

    void recordTenantUsage(tenantId, "agentCalls").catch(() => undefined)
    return textResponse(response.output_text?.trim() || "Sorry, I could not put that together. Could you say it again?")
  } catch (error) {
    console.error("Agent request error:", error)
    return new Response(JSON.stringify({ error: "The assistant could not respond right now." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    })
  }
}
