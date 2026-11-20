import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BadgeDollarSign, Lightbulb, Search, Share2, Star, Store } from "lucide-react"

import { AuthProvider } from "@/components/auth-provider"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PricingView } from "@/components/pricing-view"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { TRIAL_DAYS } from "@/lib/subscription"

/* Marketing Suite: the home for the Marketing products. AI does the work; the owner checks and approves. */

const START_HREF = "/signup"
const SALES_HREF = "/contact"

const TASKS = [
  "AI writes your social posts and schedules them for the best times.",
  "It finds what keeps your website off Google and shows you how to fix it.",
  "It drafts a reply to every review your customers leave.",
  "It writes your Google ads and tracks what each lead costs you.",
  "It keeps an eye on your business listing so customers see the right details.",
]

const PRODUCTS = [
  { icon: Share2, name: "Social", title: "Social posts written for you", body: "AI writes posts about your business, picks good times to share them and publishes them to your pages, either after you approve them or on its own if you prefer." },
  { icon: Search, name: "SEO", title: "Get found on Google", body: "AI checks your website for whatever is holding it back in search, explains each fix in plain steps and tracks your keywords so you can see your ranking improve." },
  { icon: Star, name: "Reviews", title: "Answer every review", body: "Your Google and Facebook reviews come into one place, and AI drafts a reply to each one so that no customer goes unanswered." },
  { icon: BadgeDollarSign, name: "Ads", title: "Ads that bring in leads", body: "AI writes your Google ads, tracks your spend, clicks and leads, and tells you what to change so each new customer costs you less." },
  { icon: Store, name: "Local", title: "Be found by people nearby", body: "We track your Google Business Profile so that customers searching near you find the right opening hours, address and photos." },
  { icon: Lightbulb, name: "Insights", title: "See what is working", body: "You get one marketing score and a short list of what to do next, and both update as AI works through your accounts." },
]

const STEPS = [
  { title: "Tell us about your business", body: "Add your business name, website, industry and location, which takes about a minute." },
  { title: "Connect your accounts", body: "Link your social pages, your Google Business Profile and your ads account so AI can work on them." },
  { title: "Let AI do the work", body: "AI posts, replies to reviews and improves your ads while you check in whenever it suits you." },
]

const FAQS = [
  { question: "How does the free trial work?", answer: `You get ${TRIAL_DAYS} days of every Marketing feature without entering a card, and you can pick a plan at any point to keep going after that.` },
  { question: "Do I need to know marketing?", answer: "No, because AI does the work and explains each step in plain words, and you decide how much of it you want to approve before it goes out." },
  { question: "Does AI post without asking me?", answer: "Only if you allow it, since you can choose to approve every post and reply yourself or let AI publish on its own schedule." },
  { question: "Which plan is right for me?", answer: "Essential covers social media and SEO, Pro adds your reviews, and Advanced adds Google Ads, so you can start small and move up as your business grows." },
  { question: "How does ad spend work?", answer: "Your plan pays for the tools, while the money spent on the ads themselves goes to Google separately on a budget that you set." },
  { question: "Can your team do it for me instead?", answer: "Yes, our Growth plans put our team in charge of your marketing, and every Growth plan includes Marketing Advanced." },
]

export default function MarketingSuitePage() {
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
                Let AI run your marketing for you
              </h1>
              <p className="mt-6 max-w-md text-lg opacity-85">
                AI writes your posts, improves your search ranking, answers your reviews and runs your ads, so you can spend your time running your business.
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
                  Start free trial <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="#plans" className="font-medium opacity-85 underline-offset-4 hover:opacity-100 hover:underline">
                  See plans
                </Link>
              </div>
            </div>
            <Image
              src="/images/ngai/ngai-reviews.webp"
              alt="Ngai, the VisualCNS capybara, relaxes in a hot spring on a laptop while a five-star review gets a reply"
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
          <h2 className="max-w-2xl font-semibold tracking-tight">Everything your marketing needs, in one dashboard that AI keeps running</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Instead of switching between different apps, you manage every part of your marketing from one place while AI keeps the work moving.
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
            <h2 className="font-semibold tracking-tight">Pick a plan that fits your business</h2>
            <p className="mb-8 mt-4 max-w-2xl text-muted-foreground">You can try everything free for {TRIAL_DAYS} days and move up to a bigger plan whenever you need more.</p>
            <AuthProvider>
              <PricingView cartHref="/cart" freeHref={START_HREF} only="Marketing" />
            </AuthProvider>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="font-semibold tracking-tight">You can be up and running in a few minutes</h2>
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
            <h2 className="font-semibold tracking-tight">Hand your marketing over to AI today</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">Your first {TRIAL_DAYS} days are free, and you do not need a card to start.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={START_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition-opacity hover:opacity-90"
              >
                Start free trial <ArrowRight className="size-4" aria-hidden />
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
