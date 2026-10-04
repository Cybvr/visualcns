import {
  createProject,
  getProjectBySlug,
  slugify,
  updateProject,
  type Project,
} from "./projects"
import { createTask, deleteTask, getTasksByProjectId } from "./tasks"

/**
 * The seven growth workflows, published as templates. A template is just a
 * project with isPublic true, so publishing one writes a project and one task
 * per step. They come with the Pro plan, so they carry no price of their own.
 *
 * Writing projects is admin-only under firestore.rules, so this runs from the
 * admin dashboard where the browser is already signed in as one, rather than
 * from a script that would have to log itself in.
 */
export interface TemplateSeed {
  title: string
  icon: string
  summary: string
  tools: string[]
  timeline: string
  steps: string[]
}

/** Templates belong to VisualHQ, not to a client, so no client dashboard shows them. */
export const TEMPLATE_OWNER_COMPANY_ID = "visualhq"
export const TEMPLATE_OWNER_CLIENT_NAME = "VisualHQ"

export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    title: "Marketing",
    icon: "trending",
    summary:
      "For businesses who need help running monthly marketing campaigns that create attention and follow-up.",
    tools: ["AI agents", "Meta Business Suite", "SendPulse", "Notion", "WhatsApp", "Google Sheets"],
    timeline: "Monthly",
    steps: [
      "Digital strategy",
      "Ad management",
      "SendPulse automation",
      "Notion campaign board",
      "Campaign design",
    ],
  },
  {
    title: "Orbit",
    icon: "orbit",
    summary: "For businesses who need help capturing leads, replying faster, and booking more calls.",
    tools: ["AI agents", "Website forms", "WhatsApp", "Instagram DMs", "Gmail", "CRM / Sheets", "Cal.com"],
    timeline: "Setup + monthly",
    steps: ["Lead routing", "Qualification rules", "Reminders", "Booking handoff", "Pipeline visibility"],
  },
  {
    title: "Studio",
    icon: "image",
    summary: "For businesses who need help planning, approving, and publishing content consistently.",
    tools: ["AI agents", "Notion", "Airtable", "Google Drive", "Canva", "Buffer", "Meta Business Suite"],
    timeline: "Setup + monthly",
    steps: ["Campaign board", "Content calendar", "Approval flow", "Asset library", "Publishing checklist"],
  },
  {
    title: "Launch",
    icon: "rocket",
    summary: "For businesses who need help turning ad traffic into leads and sales follow-up.",
    tools: ["AI agents", "Meta Ads", "Google Analytics", "Landing pages", "Forms", "CRM", "Email / WhatsApp"],
    timeline: "Setup + monthly",
    steps: [
      "Campaign funnel map",
      "Landing-page handoff",
      "CRM tagging",
      "Retargeting audiences",
      "Conversion tracking",
    ],
  },
  {
    title: "Pulse",
    icon: "pulse",
    summary: "For businesses who need help following up with customers who showed interest but did not buy.",
    tools: ["AI agents", "Shopify / WooCommerce", "Paystack", "Email", "WhatsApp", "CRM", "Sheets"],
    timeline: "Setup + monthly",
    steps: [
      "Drop-off triggers",
      "Reminder sequences",
      "Quote follow-up",
      "Abandoned cart recovery",
      "Reactivation lists",
    ],
  },
  {
    title: "Signal",
    icon: "chart",
    summary: "For businesses who need help understanding what is bringing leads, sales, and customer interest.",
    tools: ["AI agents", "Google Analytics", "Meta Ads", "Search Console", "CRM", "Sheets", "Looker Studio"],
    timeline: "Setup + monthly",
    steps: [
      "Data source map",
      "Reporting dashboard",
      "Weekly summary format",
      "KPI tracking",
      "Action recommendations",
    ],
  },
  {
    title: "Atlas",
    icon: "map",
    summary: "For businesses who need help onboarding clients, organizing files, and managing delivery.",
    tools: ["AI agents", "Paystack", "Notion", "Google Drive", "Slack / WhatsApp", "Forms", "Email"],
    timeline: "Setup + monthly",
    steps: ["Onboarding form", "Project workspace", "Folder automation", "Approval checkpoints", "Status update flow"],
  },
]

export function templateSeedSlug(seed: TemplateSeed): string {
  return `template-${slugify(seed.title)}`
}

/**
 * Creates or updates one seeded template. Re-running is safe: the project is
 * matched on its slug and updated in place, and its steps are rewritten so the
 * published workflow always matches this file rather than drifting from
 * whatever was written the first time.
 */
export async function publishTemplateSeed(seed: TemplateSeed): Promise<{ created: boolean; steps: number }> {
  const slug = templateSeedSlug(seed)
  const payload: Omit<Project, "id" | "createdAt" | "updatedAt"> = {
    companyId: TEMPLATE_OWNER_COMPANY_ID,
    client: TEMPLATE_OWNER_CLIENT_NAME,
    title: seed.title,
    service: "Workflow",
    // A template is finished work, which is the point of publishing it.
    status: "done",
    progress: 100,
    dueDate: "",
    slug,
    isPublic: true,
    summary: seed.summary,
    tools: seed.tools,
    icon: seed.icon,
    timeline: seed.timeline,
  }

  const existing = await getProjectBySlug(slug)
  let projectId: string
  if (existing) {
    projectId = existing.id
    await updateProject(projectId, payload)
  } else {
    projectId = await createProject(payload)
  }

  const previousSteps = await getTasksByProjectId(projectId)
  for (const step of previousSteps) {
    await deleteTask(step.id)
  }

  // Sequential so createdAt increments and the step order is preserved.
  for (const step of seed.steps) {
    await createTask({
      name: step,
      companyId: TEMPLATE_OWNER_COMPANY_ID,
      client: TEMPLATE_OWNER_CLIENT_NAME,
      projectId,
      project: seed.title,
      status: "todo",
      priority: "medium",
      dueDate: "",
      content: "",
      // Steps are read by signed-out visitors on /templates, and the rules
      // only open a task up when it carries this flag.
      isPublic: true,
    })
  }

  return { created: !existing, steps: seed.steps.length }
}
