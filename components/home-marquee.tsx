const SEPARATOR = "•" // •

/** A single, endlessly looping line of real words — no counters, no fake metrics.
 *  The track duplicates the items so the CSS translate can loop without a seam. */
export function HomeMarquee({ items }: { items: string[] }) {
  if (items.length === 0) return null

  const line = (
    <span className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-6 font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground md:px-8 md:text-sm">
            {item}
          </span>
          <span aria-hidden="true" className="text-accent">
            {SEPARATOR}
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <div
      className="home-marquee overflow-hidden border-y border-border py-5"
      aria-label={items.join(", ")}
    >
      <div className="home-marquee-track" aria-hidden="true">
        {line}
        {line}
      </div>
    </div>
  )
}
