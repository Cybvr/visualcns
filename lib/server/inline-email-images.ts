const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024

export function cidReferences(html: string | null | undefined) {
  if (!html) return new Set<string>()
  return new Set([...html.matchAll(/cid:([^"'\s)>]+)/gi)].map((match) => normalizeCid(safeDecode(match[1]))))
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function normalizeCid(value: string) {
  return value.trim().replace(/^<|>$/g, "").toLowerCase()
}

/** Swaps cid: image links for data: URLs so inline images render in the reader. */
export function inlineCidImages(html: string, images: Map<string, { contentType: string; data: Buffer }>) {
  return html.replace(/cid:([^"'\s)>]+)/gi, (match, cid: string) => {
    const image = images.get(normalizeCid(safeDecode(cid)))
    if (!image || image.data.length > MAX_INLINE_IMAGE_BYTES) return match
    return `data:${image.contentType};base64,${image.data.toString("base64")}`
  })
}
