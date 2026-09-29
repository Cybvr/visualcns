const logos = [
  { src: "/Logos/Stanbic_IBTC_Holdings_Logo.png", alt: "Stanbic IBTC" },
  { src: "/Logos/Screenshot 2026-09-29 011612.png", alt: "aella microfinance bank" },
  { src: "/Logos/Screenshot 2026-09-29 011327.png", alt: "Honeywell Group" },
  { src: "/Logos/logo-main.svg", alt: "VisualCNS" },
  { src: "/Logos/johnnie-walker-logo.png", alt: "Johnnie Walker" },
  { src: "/Logos/Flour-Mills-of-Nigeria.jpg", alt: "Flour Mills of Nigeria" },
]

function LogoGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-10 pr-10 sm:gap-16 sm:pr-16" aria-hidden={duplicate || undefined}>
      {logos.map((logo) => (
        <div key={`${duplicate ? "duplicate-" : ""}${logo.src}`} className="flex h-9 w-36 shrink-0 items-center justify-center sm:h-10 sm:w-44">
          {/* Local logo files are intentionally rendered as authored so mixed SVG/raster assets keep their natural proportions. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.src}
            alt={duplicate ? "" : logo.alt}
            className="max-h-full max-w-full object-contain grayscale opacity-60 mix-blend-multiply transition-opacity duration-300 hover:opacity-80"
          />
        </div>
      ))}
    </div>
  )
}

export function HomeLogoCarousel() {
  return (
    <section aria-label="Selected client logos" className="home-logo-strip relative overflow-hidden border-y border-border bg-muted/35 py-5 sm:py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-muted/35 to-transparent sm:w-24" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-muted/35 to-transparent sm:w-24" aria-hidden="true" />
      <div className="home-logo-track flex w-max items-center motion-reduce:animate-none">
        <LogoGroup />
        <LogoGroup duplicate />
      </div>
    </section>
  )
}
