/** Versioned metadata for Ngai's operational surface.
 *
 * The executable tool handlers still live beside the domain code for now, but
 * every run records this manifest so prompt/tool changes can be evaluated and
 * compared instead of disappearing into an unversioned route edit.
 */
export const AGENT_PROMPT_VERSION = "2026-10-16.2"
export const AGENT_TOOLSET_VERSION = "2026-10-16.2"

export type AgentToolRisk = "read" | "draft" | "write"

export type AgentSkillManifest = {
  id: string
  version: string
  description: string
  tools: string[]
}

export const AGENT_TOOL_MANIFEST: Record<string, { risk: AgentToolRisk; idempotent: boolean; skill: string }> = {
  query_workspace: { risk: "read", idempotent: true, skill: "workspace-research" },
  workspace_summary: { risk: "read", idempotent: true, skill: "workspace-research" },
  find_client: { risk: "read", idempotent: true, skill: "client-catch-up" },
  client_overview: { risk: "read", idempotent: true, skill: "client-catch-up" },
  read_file: { risk: "read", idempotent: true, skill: "document-grounding" },
  web_search: { risk: "read", idempotent: true, skill: "external-research" },
  collect_details: { risk: "read", idempotent: true, skill: "guided-creation" },
  propose_plan: { risk: "read", idempotent: true, skill: "guided-creation" },
  remember_style: { risk: "write", idempotent: false, skill: "agency-memory" },
  draft_email: { risk: "draft", idempotent: true, skill: "client-communication" },
  create_reminder: { risk: "write", idempotent: false, skill: "follow-up" },
  create_agent_job: { risk: "write", idempotent: false, skill: "durable-work" },
  update_record: { risk: "write", idempotent: false, skill: "guided-creation" },
  create_company: { risk: "write", idempotent: false, skill: "guided-creation" },
  create_project: { risk: "write", idempotent: false, skill: "guided-creation" },
  create_task: { risk: "write", idempotent: false, skill: "guided-creation" },
  create_invoice: { risk: "draft", idempotent: false, skill: "guided-creation" },
  create_estimate: { risk: "draft", idempotent: false, skill: "guided-creation" },
  create_contract: { risk: "draft", idempotent: false, skill: "guided-creation" },
  create_document: { risk: "draft", idempotent: false, skill: "guided-creation" },
  attach_file: { risk: "write", idempotent: false, skill: "document-grounding" },
  research_campaign_creators: { risk: "write", idempotent: false, skill: "campaign-research" },
  generate_campaign_parts: { risk: "write", idempotent: false, skill: "campaign-planning" },
  complete_task: { risk: "write", idempotent: false, skill: "client-portal-actions" },
  accept_estimate: { risk: "write", idempotent: false, skill: "client-portal-actions" },
}

export const AGENT_SKILLS: AgentSkillManifest[] = [
  { id: "workspace-research", version: "1.0.0", description: "Answer grounded questions from scoped workspace records.", tools: ["query_workspace", "workspace_summary"] },
  { id: "client-catch-up", version: "1.0.0", description: "Build a client briefing from the client's records and files.", tools: ["find_client", "client_overview", "read_file"] },
  { id: "guided-creation", version: "1.0.0", description: "Create or update agency records with inline detail collection.", tools: ["collect_details", "propose_plan", "update_record", "create_company", "create_project", "create_task", "create_invoice", "create_estimate", "create_contract", "create_document"] },
  { id: "document-grounding", version: "1.0.0", description: "Read and file documents without inventing their contents.", tools: ["read_file", "attach_file"] },
  { id: "agency-memory", version: "1.0.0", description: "Propose or update agency writing and operating knowledge.", tools: ["remember_style"] },
  { id: "client-communication", version: "1.0.0", description: "Prepare reviewable client email drafts.", tools: ["draft_email"] },
  { id: "follow-up", version: "1.0.0", description: "Create private follow-up reminders.", tools: ["create_reminder"] },
  { id: "durable-work", version: "1.0.0", description: "Queue resumable background agent work with retries.", tools: ["create_agent_job"] },
  { id: "campaign-research", version: "1.0.0", description: "Research and add public creator profiles to a campaign.", tools: ["research_campaign_creators"] },
  { id: "campaign-planning", version: "1.0.0", description: "Fill campaign briefs, create content drafts, set creator targets, and add execution tasks.", tools: ["generate_campaign_parts", "update_record"] },
  { id: "client-portal-actions", version: "1.0.0", description: "Perform the two safe client portal actions.", tools: ["complete_task", "accept_estimate"] },
  { id: "external-research", version: "1.0.0", description: "Search public sources when workspace data is insufficient.", tools: ["web_search"] },
]
