/**
 * The agency's knowledge for Ngai: facts about the agency that Ngai treats as
 * the source of truth when clients ask about it. Stored in the `settings`
 * collection as one doc per agency. Plain module, so the agent route can use it too.
 */

export const KNOWLEDGE_FIELDS = [
  { key: "about", label: "About us", hint: "Who you are, what you do, where you're based." },
  { key: "services", label: "Services", hint: "What you offer, and what you don't." },
  { key: "pricing", label: "Pricing", hint: "Rates, packages, deposits, what's included." },
  { key: "process", label: "How we work", hint: "Steps, timelines, revisions, how feedback works." },
  { key: "policies", label: "Policies", hint: "Payment terms, refunds, cancellations, ownership of work." },
  { key: "contact", label: "Contact and hours", hint: "Who to contact for what, office hours, response times." },
  { key: "faqs", label: "FAQs", hint: "Common questions and their answers." },
] as const

export type KnowledgeKey = (typeof KNOWLEDGE_FIELDS)[number]["key"]
export type NgaiKnowledge = Record<KnowledgeKey, string>

export const MAX_KNOWLEDGE_FIELD_LENGTH = 8000

export function knowledgeDocId(agencyId: string) {
  return `${agencyId}__ngai-knowledge`
}

export function emptyKnowledge(): NgaiKnowledge {
  return Object.fromEntries(KNOWLEDGE_FIELDS.map((field) => [field.key, ""])) as NgaiKnowledge
}

export function toKnowledge(data: Record<string, unknown> | undefined): NgaiKnowledge {
  const knowledge = emptyKnowledge()
  for (const { key } of KNOWLEDGE_FIELDS) {
    const value = data?.[key]
    if (typeof value === "string") knowledge[key] = value.slice(0, MAX_KNOWLEDGE_FIELD_LENGTH)
  }
  return knowledge
}

/** The filled-in sections as text for Ngai's instructions. Empty when nothing is filled in. */
export function knowledgeText(knowledge: NgaiKnowledge): string {
  return KNOWLEDGE_FIELDS
    .filter(({ key }) => knowledge[key].trim())
    .map(({ key, label }) => `## ${label}\n${knowledge[key].trim()}`)
    .join("\n\n")
}
