import { ArrowRight, Check } from "lucide-react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { NgaiProductHeader } from "@/components/ngai/ngai-product-header"
import { NgaiPromptBox } from "@/components/ngai/ngai-prompt-box"
import { NgaiPricing } from "@/components/ngai/ngai-pricing"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { NGAI_APP_URL, ngaiStartUrl } from "@/lib/ngai"

const USE_CASES = [
  {
    id: "web-apps",
    label: "Web apps",
    title: "Tools your business actually uses",
    body: "Booking systems, client portals, internal trackers. Describe the workflow and Ngai builds the screens, forms and logic.",
    points: ["Forms and records", "Logins for your team or customers", "Works on any device"],
    prompt: "A booking app for my clinic where patients pick a time and get a reminder",
  },
  {
    id: "websites",
    label: "Websites",
    title: "A site that looks like you paid for it",
    body: "Tell Ngai about your business and get a full site with pages, copy and images you can change by chatting.",
    points: ["Pages written for you", "Contact and lead forms", "Your own domain"],
    prompt: "A website for my catering business with a menu, gallery and quote form",
  },
  {
    id: "stores",
    label: "Online stores",
    title: "Start selling this week",
    body: "Products, cart and checkout in one go. Add items by describing them and update prices whenever you like.",
    points: ["Product pages and cart", "Order notifications", "Easy price changes"],
    prompt: "An online store for my handmade bags with a cart and WhatsApp ordering",
  },
  {
    id: "dashboards",
    label: "Dashboards",
    title: "See your numbers at a glance",
    body: "Turn spreadsheets and daily figures into charts and summaries the whole team can read.",
    points: ["Charts and tables", "Daily and monthly views", "Shareable link"],
    prompt: "A sales dashboard for my shop showing daily revenue and top products",
  },
  {
    id: "portfolios",
    label: "Portfolios",
    title: "Show your work properly",
    body: "A clean home for your projects, photos or case studies, with a way for clients to reach you.",
    points: ["Project galleries", "About and services", "Contact form"],
    prompt: "A portfolio for my interior design work with project galleries and a contact form",
  },
]

const STEPS = [
  { title: "Describe it", body: "Say what you want in plain words, like you'd tell a designer." },
  { title: "Watch it build", body: "Ngai writes the app and shows a live preview as it goes." },
  { title: "Refine and publish", body: "Ask for changes, then publish to your own link in one click." },
]

// TODO(copy): placeholder template names — swap for real builder templates when they're listed.
const TEMPLATES = [
  { name: "Salon booking", category: "Web app", prompt: "A salon booking app with services, staff and time slots" },
  { name: "Restaurant site", category: "Website", prompt: "A restaurant website with a menu, opening hours and reservations" },
  { name: "Fashion store", category: "Online store", prompt: "An online fashion store with categories, cart and checkout" },
  { name: "Sales tracker", category: "Dashboard", prompt: "A dashboard to track monthly sales and expenses" },
  { name: "Photographer", category: "Portfolio", prompt: "A photography portfolio with galleries and a booking form" },
  { name: "Event RSVP", category: "Web app", prompt: "An event page with RSVP form and guest list" },
]

const FAQS = [
  {
    q: "Do I need to know how to code?",
    a: "No. You describe what you want and Ngai builds it. You can change anything by asking in the chat.",
  },
  {
    q: "What can I build with Ngai?",
    a: "Websites, web apps, online stores, dashboards and portfolios. If it runs in a browser, you can probably build it.",
  },
  {
    q: "Is it really free to start?",
    a: "Yes. The Free plan lets you build and publish your first project. Upgrade when you need more apps or credits.",
  },
  {
    q: "Can I use my own domain?",
    a: "Every app gets a free Ngai link. Paid plans let you connect your own domain.",
  },
  {
    q: "Who owns what I build?",
    a: "You do. Your projects and their content belong to you.",
  },
  {
    q: "Can VisualHQ help if I get stuck?",
    a: "Yes. Our team can pick up any Ngai project and take it further for you.",
  },
]

export default function NgaiPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />
      <NgaiProductHeader />

      <main>
        {/* Hero */}
        <section id="overview" className="scroll-mt-40 px-4 pb-16 pt-16 text-center md:px-8 md:pb-24 md:pt-24">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Ngai AI builder</p>
          <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            No code. No limits.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Tell Ngai what you need and watch it build a working app or website, ready to share in minutes.
          </p>
          <div className="mt-10">
            <NgaiPromptBox />
          </div>
        </section>

        {/* Use cases */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">One builder, whatever you need</h2>
            <Tabs defaultValue={USE_CASES[0].id} className="mt-10">
              <TabsList className="h-auto flex-wrap">
                {USE_CASES.map((useCase) => (
                  <TabsTrigger key={useCase.id} value={useCase.id}>
                    {useCase.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {USE_CASES.map((useCase) => (
                <TabsContent key={useCase.id} value={useCase.id} className="mt-6">
                  <div className="grid gap-8 rounded-2xl border border-border bg-background p-6 md:grid-cols-2 md:p-10">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight">{useCase.title}</h3>
                      <p className="mt-3 text-muted-foreground">{useCase.body}</p>
                      <ul className="mt-6 space-y-2 text-sm">
                        {useCase.points.map((point) => (
                          <li key={point} className="flex gap-2">
                            <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col justify-between gap-6 rounded-xl bg-muted p-6">
                      <p className="text-sm text-muted-foreground">Try this prompt</p>
                      <p className="text-lg font-medium">&ldquo;{useCase.prompt}&rdquo;</p>
                      <Button className="self-start" asChild>
                        <a href={ngaiStartUrl(useCase.prompt)}>
                          Build this <ArrowRight />
                        </a>
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">From idea to live in three steps</h2>
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

        {/* Templates */}
        <section id="templates" className="scroll-mt-40 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Start from a template</h2>
                <p className="mt-4 max-w-2xl text-muted-foreground">Pick a starting point and make it yours by chatting.</p>
              </div>
              <Button variant="outline" asChild>
                <a href={NGAI_APP_URL}>
                  Browse all templates <ArrowRight />
                </a>
              </Button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((template) => (
                <a
                  key={template.name}
                  href={ngaiStartUrl(template.prompt)}
                  className="group rounded-2xl border border-border bg-background p-6 transition-colors hover:border-foreground"
                >
                  <div className="aspect-[16/10] rounded-xl bg-muted" aria-hidden />
                  <p className="mt-4 text-sm text-muted-foreground">{template.category}</p>
                  <h3 className="mt-1 font-semibold">{template.name}</h3>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-40 mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Simple pricing</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">Start free. Upgrade when you&apos;re ready.</p>
          <NgaiPricing />
        </section>

        {/* FAQ */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Questions</h2>
            <Accordion type="single" collapsible className="mt-8">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl rounded-3xl bg-foreground px-6 py-14 text-center text-background md:px-12">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Build your first app today</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">Describe it, watch it come together, and share it in minutes.</p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" variant="secondary" asChild>
                <a href={NGAI_APP_URL}>
                  Start for Free <ArrowRight />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
