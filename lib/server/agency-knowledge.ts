import { adminServices } from "@/lib/firebase-admin"
import { knowledgeDocId, knowledgeText } from "@/lib/ngai-knowledge"

export const KNOWLEDGE_RULES = `What the agency has told you about itself follows. It is the source of truth for questions about
the agency: its services, pricing, process, policies and contacts. Answer from it, and never contradict it.
If it doesn't cover a question about the agency, say you're not sure and suggest asking the agency directly.
Don't guess or use web_search for facts about the agency.`

/** The agency's knowledge from Settings > Ngai Knowledge, for Ngai's instructions. */
export async function agencyKnowledge(agencyId: string): Promise<string> {
  try {
    const { db } = adminServices()
    const snapshot = await db.collection("settings").doc(knowledgeDocId(agencyId)).get()
    return knowledgeText(snapshot.data()).trim()
  } catch {
    return ""
  }
}
