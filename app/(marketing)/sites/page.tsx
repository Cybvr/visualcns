import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Globe, Inbox, LayoutTemplate, Link2, MessageSquareText, Smartphone } from "lucide-react"

import { AuthProvider } from "@/components/auth-provider"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PricingView } from "@/components/pricing-view"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

/* Sites: the home for the AI website builder. Sites have no price of their own; they come with every Growth plan. */

const START_HREF = "/signup"
const SALES_HREF = "/contact"

const TASKS = [
  "AI builds your website from a short description of your business.",
  "You change anything by asking for it in plain words.",
  "Your site goes live at its own address as soon as you publish it.",
  "You can point your own domain at it whenever you are ready.",
  "Enquiries from your site land in one inbox so none get lost.",
]

const PRODUCTS = [
  { icon: MessageSquareText, name: "Build", title: "Describe it and AI builds it", body: "Tell AI what your business does and who it serves, and it writes the pages, the words and the layout while you watch a live preview." },
  { icon: LayoutTemplate, name: "Templates", title: "Start from a finished design", body: "If you would rather not start from a blank page, pick a template made for your kind of business and AI fills it in with your details." },
  { icon: Globe, name: "Publish", title: "Live in one click", body: "When you are happy with your site, you publish it and it gets its own web address straight away, with no hosting to set up." },
  { icon: Link2, name: "Domains", title: "Use your own domain", body: "Connect a domain like yourbusiness.com so that customers find you at an address that carries your name." },
  { icon: Inbox, name: "Messages", title: "Every enquiry in one inbox", body: "Contact and booking forms on your site send their entries to one inbox in your dashboard, so you can reply to customers quickly." },
  { icon: Smartphone, name: "Mobile", title: "Looks right on every phone", body: "Every site is built to work on phones, tablets and computers, because that is where most of your customers will find you." },
]

const STEPS = [
  { title: "Describe your business", body: "Write a few lines about what you do, or pick a template that is close to what you want." },
  { title: "Shape it with AI", body: "Ask AI to change the words, colours, pages or photos until the site feels like yours." },
  { title: "Publish and share", body: "Publish your site, connect your domain if you have one, and start sharing the link with customers." },
]

const FAQS = [
  { question: "How much does a website cost?", answer: "Sites do not have a separate price, because they come included with every Growth plan along with Marketing, Pass and Pulse." },
  { question: "Do I need to know how to code or design?", answer: "No, because you build and edit your site by describing what you want in plain words, and AI does the design and the code for you." },
  { question: "Can I use my own domain name?", answer: "Yes, you can connect a domain you already own, and your site will show at that address instead of the one we give you." },
  { question: "Where do messages from my site go?", answer: "Entries from the forms on your site go to the Messages inbox in your dashboard, where you can read and follow up on each one." },
  { question: "Can I change my site after it is live?", answer: "Yes, you can ask AI for changes at any time, and your live site updates when you publish again." },
  { question: "Can your team build the site for me instead?", answer: "Yes, if you would like a custom build, our team can design and build it for you, and you can talk to us about what you need." },
]

export default function SitesPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-foreground text-background">
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_80%_30%,rgba(59,130,246,0.25),transparent),radial-gradient(50%_60%_at_10%_90%,rgba(16,185,129,0.2),transparent)]"
            aria-hidden
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-36 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pb-24 md:pt-44">
            <div>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
                Let AI build your business a website
              </h1>
              <p className="mt-6 max-w-md text-lg opacity-85">
                Describe your business and AI builds a website you can edit, publish and grow yourself, and it comes included with every Growth plan.
              </p>
              <ul className="mt-6 max-w-md space-y-2">
                {TASKS.map((task) => (
                  <li key={task} className="flex items-start gap-3 text-sm opacity-85 md:text-base">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                    {task}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  href={START_HREF}
                  className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-background px-6 font-medium text-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-background"
                >
                  Start building <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="#plans" className="font-medium opacity-85 underline-offset-4 hover:opacity-100 hover:underline">
                  See plans
                </Link>
              </div>
            </div>
            <Image
              src="/images/ngai/ngai-sites.webp"
              alt="Ngai, the VisualCNS capybara, types on a laptop on a beanbag while a bakery website builds itself"
              width={896}
              height={1120}
              priority
              sizes="(min-width: 768px) 40vw, 100vw"
              className="mx-auto w-full max-w-md rounded-3xl md:max-w-none"
            />
          </div>
        </section>

        {/* Products */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="max-w-2xl font-semibold tracking-tight">Everything you need for a website, built and run from one place</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            You build, publish and manage your site from the same dashboard as the rest of your business, so there is no separate builder or hosting account to juggle.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <div key={product.name} className="rounded-2xl border border-border p-6">
                <product.icon className="size-5 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{product.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{product.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="scroll-mt-24 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="font-semibold tracking-tight">Sites come with every Growth plan</h2>
            <p className="mb-8 mt-4 max-w-2xl text-muted-foreground">There is no separate price for a website, because building and publishing sites is part of every Growth plan alongside Marketing, Pass and Pulse.</p>
            <AuthProvider>
              <PricingView cartHref="/cart" freeHref={START_HREF} only="Growth" showCompare={false} />
            </AuthProvider>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="font-semibold tracking-tight">You can have a site live in a few minutes</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-border p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="font-semibold tracking-tight">Common questions</h2>
            <Accordion type="single" collapsible className="mt-8">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl rounded-3xl bg-foreground px-6 py-14 text-center text-background md:px-12">
            <h2 className="font-semibold tracking-tight">Build your website today</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">Sign up, describe your business, and AI will have a first version of your site ready in minutes.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={START_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition-opacity hover:opacity-90"
              >
                Start building <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={SALES_HREF}
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-6 font-medium transition-colors hover:bg-background/10"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
