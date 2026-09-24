import { cn } from "@/lib/utils"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function taskContentHtml(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return "<p>No details added.</p>"
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed
  return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, "<br />")}</p>`
}

export function TaskContent({ value, className }: { value: string; className?: string }) {
  return (
    <div
      className={cn(
        "break-words text-sm leading-7 text-muted-foreground [&_a]:break-all [&_a]:text-primary [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: taskContentHtml(value) }}
    />
  )
}
