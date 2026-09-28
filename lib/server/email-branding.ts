// The branded email layout, shared by the send route and the daily reminder job.

export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.visualcns.com"
export const X_URL = "https://x.com/visualcns"
export const LINKEDIN_URL = "https://www.linkedin.com/company/visualng"

export function normalizeEmailAddress(value: string) {
  const normalized = value
    .replace(/(?:&nbsp;|&#(?:x0*a0|160|x0*20|32);)/gi, " ")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  // Strip a wrapping pair of quotes, e.g. EMAIL_FROM set as
  // "VisualCNS <hello@mail.visualcns.com>" \u2014 Resend rejects the quoted whole.
  if (normalized.length >= 2 && /^(["']).*\1$/.test(normalized)) {
    return normalized.slice(1, -1).trim()
  }
  return normalized
}

export function extractEmailAddress(value: string) {
  const normalized = normalizeEmailAddress(value)
  const match = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0] || normalized
}

type EmailBrand = {
  name: string
  email: string
  phone: string
  address: string
  website: string
  logoUrl: string
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string)
}

export function safeBrandValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 500) : fallback
}

export function absoluteWebUrl(value: string, fallback: string) {
  const candidate = value.startsWith("/") ? `${SITE_ORIGIN}${value}` : value
  try {
    const url = new URL(candidate || fallback)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : fallback
  } catch {
    return fallback
  }
}

export function brandedEmail(content: string, subject: string, input: unknown, senderAddress: string, ctaInput: unknown, unsubscribeLink = "") {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {}
  const brand: EmailBrand = {
    name: safeBrandValue(source.name, "VisualCNS") || "VisualCNS",
    email: extractEmailAddress(senderAddress || safeBrandValue(source.email, "info@visualcns.com")),
    phone: safeBrandValue(source.phone),
    address: safeBrandValue(source.address, "Lagos, Nigeria"),
    website: safeBrandValue(source.website, "visualcns.com"),
    logoUrl: safeBrandValue(source.logoUrl, `${SITE_ORIGIN}/visualcns-email-logo.png`) || `${SITE_ORIGIN}/visualcns-email-logo.png`,
  }
  const websiteUrl = absoluteWebUrl(brand.website, SITE_ORIGIN)
  const ctaSource = ctaInput && typeof ctaInput === "object" ? ctaInput as Record<string, unknown> : {}
  const ctaText = safeBrandValue(ctaSource.text, "Open your company page") || "Open your company page"
  const ctaUrl = absoluteWebUrl(safeBrandValue(ctaSource.url), `${SITE_ORIGIN}/`)
  const contactItems = brand.address ? escapeHtml(brand.address) : ""
  const websiteLink = brand.website
    ? `<a href="${escapeHtml(websiteUrl)}" style="color:#5f6472;text-decoration:underline;">${escapeHtml(brand.website)}</a>`
    : ""
  const unsubscribeMarkup = unsubscribeLink
    ? `<div style="margin-top:12px;"><a href="${escapeHtml(unsubscribeLink)}" style="color:#5f6472;text-decoration:underline;">Unsubscribe from marketing emails</a></div>`
    : ""
  const preheader = escapeHtml(subject).slice(0, 140)

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f4f7;color:#20232d;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f3f4f7;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:0;border-radius:0;overflow:visible;">
            <tr>
              <td style="padding:22px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="vertical-align:middle;height:56px;line-height:0;"><img src="${escapeHtml(brand.logoUrl)}" width="320" alt="${escapeHtml(brand.name)}" style="display:block;width:320px;max-width:100%;height:auto;max-height:56px;object-fit:contain;object-position:left center;border:0;"></td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 12px;font-size:15px;line-height:1.65;color:#303440;overflow-wrap:anywhere;">${content}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 30px;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#111318;border-radius:999px;color:#ffffff;padding:12px 20px;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;">${escapeHtml(ctaText)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f8f8fa;border-top:1px solid #e7e8ec;font-size:12px;line-height:1.6;color:#6d7280;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:top;text-align:left;">
                      <div style="font-weight:700;color:#303440;">${escapeHtml(brand.name)}</div>
                      ${contactItems ? `<div style="margin-top:4px;">${contactItems}</div>` : ""}
                      ${websiteLink ? `<div style="margin-top:4px;">${websiteLink}</div>` : ""}
                      ${unsubscribeMarkup}
                    </td>
                    <td style="vertical-align:top;text-align:right;white-space:nowrap;">
                      <a href="${X_URL}" aria-label="X" style="display:inline-block;margin-left:12px;color:#303440;font-weight:700;text-decoration:none;">X</a>
                      <a href="${LINKEDIN_URL}" aria-label="LinkedIn" style="display:inline-block;margin-left:12px;color:#303440;font-weight:700;text-decoration:none;">in</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
