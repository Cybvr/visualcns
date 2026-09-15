import Link from "next/link"
import { Linkedin, Twitter, type LucideIcon } from "lucide-react"
import { BrandLockup } from "@/components/brand-lockup"

const footerGroups = [
  {
    number: "01",
    title: "Product",
    links: [
      { name: "VisualHQ", href: "/brands/visualhq" },
      { name: "Pasive", href: "/brands/pasive" },
      { name: "Juju", href: "/brands/juju" },
      { name: "Waddi", href: "/brands/waddi" },
      { name: "Finance", href: "/finance" },
      { name: "Templates", href: "/templates" },
      { name: "Pricing", href: "/pricing" },
    ],
  },
  {
    number: "02",
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Case Studies", href: "/case-studies" },
      { name: "FAQ", href: "/faq" },
      { name: "Careers", href: "https://pasive.co/jobs" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    number: "03",
    title: "Resources",
    links: [
      { name: "Blog", href: "/blog" },
      { name: "Capabilities", href: "/capabilities" },
      { name: "Industries", href: "/industries" },
    ],
  },
]

const offices = [
  {
    country: "United States",
    lines: ["30 N Gould St Ste R", "Sheridan, WY 82801", "USA"],
  },
  {
    country: "Nigeria",
    lines: [
      "Plot 1 Block, Marwa Bus Stop",
      "128 Remi Olowude St, Lekki Phase I",
      "Lekki 105102, Lagos, Nigeria",
    ],
  },
]

const socialLinks: Array<{ name: string; href: string; icon: LucideIcon }> = [
  { name: "X", href: "https://x.com/visualcns", icon: Twitter },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/visualng", icon: Linkedin },
]

const legalLinks = [
  { name: "Privacy", href: "/privacy" },
  { name: "Cookies", href: "/cookies" },
  { name: "Terms", href: "/terms" },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 md:px-20 md:py-12">
        <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-end">
          <div className="flex flex-col gap-3">
            <Link href="/" className="group inline-flex items-center gap-4" aria-label="VisualCNS home">
              <BrandLockup invert logoSize={52} gapClassName="gap-1.5" wordmarkScale={0.98} />
            </Link>
            <p className="text-lg font-medium tracking-tight text-primary-foreground md:text-xl">Dream.Execute</p>
          </div>

          <p className="max-w-md text-sm leading-6 text-primary-foreground/70 md:ml-auto md:text-right md:text-base">
            A global creative consultancy that develops digital experiences, brand systems, and technology solutions for
            modern businesses.
          </p>
        </div>

        <div className="my-8 border-t border-primary-foreground/15" />

        <div className="grid gap-8 md:grid-cols-4 md:gap-8">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 flex items-baseline gap-2 text-xs uppercase tracking-[0.18em] text-primary-foreground">
                <span className="font-mono text-xs text-accent">{group.number}</span>
                <span>{group.title}</span>
              </h3>
              <nav className="flex flex-col gap-2" aria-label={`${group.title} footer links`}>
                {group.links.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-sm text-primary-foreground/65 transition-colors hover:text-accent md:text-base"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          <div>
            <h3 className="mb-4 flex items-baseline gap-2 text-xs uppercase tracking-[0.18em] text-primary-foreground">
              <span className="font-mono text-xs text-accent">04</span>
              <span>Stay looped in</span>
            </h3>
            <p className="mb-4 text-sm leading-6 text-primary-foreground/65">
              Send a note when you are ready to build, price, or ship the next system.
            </p>
            <a
              href="mailto:info@visualcns.com?subject=VisualCNS%20project%20inquiry"
              className="group flex items-center justify-between border-b border-primary-foreground/70 pb-3 text-primary-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <span className="text-sm text-primary-foreground/70 transition-colors group-hover:text-accent">
                info@visualcns.com
              </span>
              <span className="text-sm uppercase tracking-[0.18em]">Join -&gt;</span>
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-8 border-t border-primary-foreground/15 pt-6 md:grid-cols-4 md:gap-8">
          {offices.map((office) => (
            <address key={office.country} className="not-italic">
              <h3 className="mb-3 flex items-baseline gap-2 text-xs uppercase tracking-[0.18em] text-primary-foreground">
                <span>{office.country}</span>
              </h3>
              <p className="text-sm leading-6 text-primary-foreground/65">
                {office.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </address>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/55 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>© {year} Visual Core Nine Systems</span>
            <span aria-hidden="true">·</span>
            <nav aria-label="Legal footer links" className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {legalLinks.map((item, index) => (
                <span key={item.name} className="flex items-center gap-x-3">
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <Link
                    href={item.href}
                    className="text-primary-foreground/70 underline decoration-primary-foreground/25 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                  >
                    {item.name}
                  </Link>
                </span>
              ))}
            </nav>
          </div>
          <div className="flex gap-8 text-sm font-semibold tracking-[0.16em] text-primary-foreground">
            {socialLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-10 items-center justify-center rounded-full border border-primary-foreground/20 transition-colors hover:border-accent hover:text-accent"
                aria-label={`VisualCNS on ${item.name}`}
              >
                <item.icon className="size-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
