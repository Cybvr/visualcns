/** Accept only local app destinations for post-auth redirects. */
export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null
  let decoded: string
  try { decoded = decodeURIComponent(value) } catch { return null }
  if (/[\\\u0000-\u0020]/.test(decoded) || decoded.startsWith("//")) return null
  const url = new URL(value, "https://visualhq.invalid")
  const decodedUrl = new URL(decoded, "https://visualhq.invalid")
  if (url.origin !== "https://visualhq.invalid" || /^\/(login|signup)(\/|$)/.test(decodedUrl.pathname)) return null
  return `${url.pathname}${url.search}${url.hash}`
}

export function companyPath(company: string): string {
  return `/${encodeURIComponent(company)}`
}

export function companyDocumentPath(company: string, kind: "invoice" | "estimate" | "contract" | "document", id: string): string {
  return `${companyPath(company)}?doc=${encodeURIComponent(`${kind}:${id}`)}`
}
