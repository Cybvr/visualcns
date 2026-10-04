/**
 * The agency's knowledge for Ngai: one block of text about the agency that Ngai
 * treats as the source of truth when clients ask about it. Stored in the
 * `settings` collection as one doc per agency. Plain module, so the agent route can use it too.
 */

export const MAX_KNOWLEDGE_LENGTH = 60000

/** Boxes from the first version, folded into the one text if it hasn't been saved since. */
const OLD_SECTIONS = [
  ["about", "About us"],
  ["services", "Services"],
  ["pricing", "Pricing"],
  ["process", "How we work"],
  ["policies", "Policies"],
  ["contact", "Contact and hours"],
  ["faqs", "FAQs"],
] as const

export function knowledgeDocId(agencyId: string) {
  return `${agencyId}__ngai-knowledge`
}

export function knowledgeText(data: Record<string, unknown> | undefined): string {
  if (typeof data?.content === "string") return data.content.slice(0, MAX_KNOWLEDGE_LENGTH)
  return OLD_SECTIONS
    .filter(([key]) => typeof data?.[key] === "string" && String(data[key]).trim())
    .map(([key, label]) => `## ${label}\n${String(data?.[key]).trim()}`)
    .join("\n\n")
    .slice(0, MAX_KNOWLEDGE_LENGTH)
}
