import Link from "next/link"
import { Linkedin, Twitter, type LucideIcon } from "lucide-react"
import { BrandLockup } from "@/components/brand-lockup"
import { CurrencySelect } from "@/components/currency-select"

const footerGroups = [
  {
    number: "01",
    title: "Product",
    links: [
      { name: "Pass", href: "/pass" },
      { name: "Pulse", href: "/pulse" },
      { name: "Ngai", href: "/help" },
      { name: "Pasive", href: "/brands/pasive" },
      { name: "Juju", href: "/brands/juju" },
      { name: "Waddi", href: "/brands/waddi" },
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
      { name: "Pricing", href: "/pricing" },
    ],
  },
  {
    number: "03",
    title: "Help",
    links: [
      { name: "Ask Ngai", href: "/help" },
      { name: "FAQs", href: "/help?tab=faqs" },
      { name: "Resources", href: "/help?tab=resources" },
      { name: "Growth", href: "/help?tab=workflows" },
    ],
  },
]

const socialLinks: Array<{ name: string; href: string; icon: LucideIcon }> = [
  { name: "X", href: "https://x.com/visualcns", icon: Twitter },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/visualng", icon: Linkedin },
]

// Card brands accepted at checkout. Icons from the payment-icons package (MPL-2.0), in public/payment-icons.
const paymentCards = [
  { name: "Visa", src: "/payment-icons/visa.svg" },
  { name: "Mastercard", src: "/payment-icons/mastercard.svg" },
  { name: "American Express", src: "/payment-icons/amex.svg" },
  { name: "Discover", src: "/payment-icons/discover.svg" },
  { name: "JCB", src: "/payment-icons/jcb.svg" },
  { name: "Diners Club", src: "/payment-icons/diners.svg" },
]

const legalLinks = [
  { name: "Privacy", href: "/privacy" },
  { name: "Cookies", href: "/cookies" },
  { name: "Terms", href: "/terms" },
]

export function Footer() {
  const year = new Date().getFullYear()

  // Always the dark theme, whatever the page uses: "dark" re-scopes the colour tokens to this footer.
  return (
    <footer className="dark bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 md:px-20 md:py-12">
        <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-end">
          <div className="flex flex-col gap-3">
            <Link href="/" className="group inline-flex items-center gap-4" aria-label="VisualCNS home">
              <BrandLockup logoSize={32} gapClassName="gap-1.5" wordmarkScale={0.85} wordmarkWeight={600} />
            </Link>
            <p className="text-lg font-medium tracking-tight text-foreground md:text-xl">Dream.Execute</p>
          </div>

          <p className="max-w-md text-sm leading-6 text-foreground/70 md:ml-auto md:text-right md:text-base">
            Business Growth software for modern brands.
          </p>
        </div>

        <div className="my-8 border-t border-border" />

        <div className="grid gap-8 md:grid-cols-4 md:gap-8">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 flex items-baseline gap-2 text-xs uppercase tracking-[0.18em] text-foreground">
                <span className="font-mono text-xs text-primary">{group.number}</span>
                <span>{group.title}</span>
              </h3>
              <nav className="flex flex-col gap-2" aria-label={`${group.title} footer links`}>
                {group.links.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-sm text-foreground/65 transition-colors hover:text-primary md:text-base"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          <div>
            <h3 className="mb-4 flex items-baseline gap-2 text-xs uppercase tracking-[0.18em] text-foreground">
              <span className="font-mono text-xs text-primary">04</span>
              <span>Stay looped in</span>
            </h3>
            <p className="mb-4 text-sm leading-6 text-foreground/65">
              Send a note when you are ready to build, price, or ship the next system.
            </p>
            <a
              href="mailto:hello@visualcns.com?subject=VisualCNS%20project%20inquiry"
              className="group flex items-center justify-between border-b border-border pb-3 text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <span className="text-sm text-foreground/70 transition-colors group-hover:text-primary">
                hello@visualcns.com
              </span>
              <span className="text-sm uppercase tracking-[0.18em]">Join -&gt;</span>
            </a>
          </div>
        </div>

        <ul className="mt-10 flex flex-wrap items-center gap-2" aria-label="Cards we accept">
          {paymentCards.map((card) => (
            <li key={card.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.src} alt={card.name} title={card.name} width={48} height={30} className="h-[30px] w-12 rounded" />
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6 text-xs text-foreground/55 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>© {year} Visual Core Nine Systems</span>
            <span aria-hidden="true">·</span>
            <nav aria-label="Legal footer links" className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {legalLinks.map((item, index) => (
                <span key={item.name} className="flex items-center gap-x-3">
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <Link
                    href={item.href}
                    className="text-foreground/70 underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                  >
                    {item.name}
                  </Link>
                </span>
              ))}
            </nav>
            <span aria-hidden="true">·</span>
            <CurrencySelect labeled />
          </div>
          <div className="flex gap-8 text-sm font-semibold tracking-[0.16em] text-foreground">
            {socialLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary"
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
