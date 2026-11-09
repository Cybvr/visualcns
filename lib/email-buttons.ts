/**
 * A button written into an email's own text, such as "View and pay invoice".
 * In the editor it is a link with the `email-button` class, shown as a pill;
 * when the email is sent or previewed it gets inline styles, since email apps
 * ignore style sheets.
 */

export const EMAIL_BUTTON_CLASS = "email-button"

const BUTTON_STYLE = "display:inline-block;background:#111318;border-radius:999px;color:#ffffff;padding:12px 20px;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;"

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** A paragraph holding one button link, for the editor. */
export function emailButtonHtml(text: string, url: string) {
  return `<p><a class="${EMAIL_BUTTON_CLASS}" href="${escapeHtml(url)}">${escapeHtml(text)}</a></p>`
}

/** Gives every button link in the message its inline button styling. */
export function styleEmailButtons(html: string) {
  return html.replace(/<a\b([^>]*\bclass="[^"]*\bemail-button\b[^"]*"[^>]*)>/gi, (_match, attributes: string) => {
    const withoutStyle = attributes.replace(/\sstyle="[^"]*"/i, "")
    return `<a${withoutStyle} style="${BUTTON_STYLE}">`
  })
}
