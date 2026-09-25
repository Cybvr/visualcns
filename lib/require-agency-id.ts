/** Server-side agency resolution. Missing ownership is an error, never a shared fallback. */
export function requireAgencyId(data: { agencyId?: unknown } | null | undefined): string {
  const value = data?.agencyId
  if (typeof value !== "string" || !value.trim()) throw new Error("Your account has no agency assigned.")
  return value.trim()
}

/** VisualCNS owns the public marketing pages in this app. */
export function getSiteAgencyId(): string {
  return "visualcns"
}
