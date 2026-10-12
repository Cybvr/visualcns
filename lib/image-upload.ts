const MAX_SOURCE_BYTES = 30 * 1024 * 1024
const MAX_OUTPUT_BYTES = 900 * 1024
const MAX_IMAGE_EDGE = 1600
const MIN_IMAGE_EDGE = 900
const WEBP_QUALITIES = [0.84, 0.76, 0.68, 0.6]

function imageBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image could not be prepared.")), type, quality)
  })
}

function drawImage(bitmap: ImageBitmap, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("The image could not be prepared.")
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Keeps uploaded raster images email- and browser-friendly without changing
 * ordinary documents or vector assets. Large images are resized and encoded
 * before Firebase Storage sees them.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  // Vector and animated assets should not be flattened by a canvas conversion.
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That image is larger than 30 MB.")

  const bitmap = await createImageBitmap(file)
  try {
    if (file.size <= MAX_OUTPUT_BYTES && Math.max(bitmap.width, bitmap.height) <= MAX_IMAGE_EDGE) return file

    let maxEdge = MAX_IMAGE_EDGE
    let blob: Blob | null = null

    // WebP is substantially smaller than GPT's PNG output and preserves alpha.
    // Reduce quality first, then dimensions, so ordinary uploads stay sharp.
    while (maxEdge >= MIN_IMAGE_EDGE && (!blob || blob.size > MAX_OUTPUT_BYTES)) {
      const canvas = drawImage(bitmap, maxEdge)
      for (const quality of WEBP_QUALITIES) {
        blob = await imageBlob(canvas, "image/webp", quality)
        if (blob.size <= MAX_OUTPUT_BYTES) break
      }
      maxEdge = Math.round(maxEdge * 0.82)
    }

    if (!blob || blob.size > MAX_OUTPUT_BYTES) throw new Error("That image is still too large after compression.")

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image"
    return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}
