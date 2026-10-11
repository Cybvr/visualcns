export const TRANSACTIONAL_TEMPLATES = [
  {
    id: "visitor-arrival",
    name: "Visitor arrival",
    subject: "{{visitorName}} is here to see you",
    body: "<p>{{visitorName}} {{arrivalTime}} at the {{companyName}} front desk.</p><p>{{visitorDetails}}</p>",
    variables: ["visitorName", "arrivalTime", "companyName", "visitorDetails"],
  },
  {
    id: "staff-invitation",
    name: "Staff invitation",
    subject: "{{inviterName}} invited you to {{companyName}}",
    body: "<p>{{inviterName}} added you to {{companyName}}'s visitor sign-in.</p><p>Visitors can pick you when they arrive at the front desk, and you will receive an email when they do.</p><p>Accept the invite to set up your account. The link works for 7 days.</p><p><a href=\"{{inviteUrl}}\">Accept invite</a></p>",
    variables: ["inviterName", "companyName", "inviteUrl"],
  },
] as const

export function fillMessageTemplate(template: string, values: Record<string, string>, html = false) {
  return template.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`Unknown message variable: ${key}`)
    const value = values[key]
    return html ? value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!) : value.replace(/[\r\n]/g, " ")
  })
}
