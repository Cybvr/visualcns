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
  "Writes and schedules your social posts",
  "Fixes what keeps you off Google",
  "Replies to your reviews",
  "Builds and tests your ads",
  "Keeps your business listing up to date",
]

const PRODUCTS = [
  { icon: Share2, name: "Social", title: "Posts that write themselves", body: "AI writes posts for your business, picks the times and publishes them to your pages. You approve or let it run." },
  { icon: Search, name: "SEO", title: "Get found on Google", body: "AI checks your site, finds what holds you back in search and gives you each fix in plain steps. It tracks your keywords as you climb." },
  { icon: Star, name: "Reviews", title: "Every review answered", body: "See your Google and Facebook reviews in one place. AI drafts a reply to each one so no customer goes unanswered." },
  { icon: BadgeDollarSign, name: "Ads", title: "Ads that pay for themselves", body: "AI writes your Google ads, tracks spend, clicks and leads, and tells you what to change to cut your cost per lead." },
  { icon: Store, name: "Local", title: "Show up nearby", body: "Track your Google Business Profile so customers near you find the right hours, address and photos." },
  { icon: Lightbulb, name: "Insights", title: "Know what's working", body: "One marketing score and a short list of what to do next, updated as AI works through your accounts." },
]

const STEPS = [
  { title: "Tell us about your business", body: "Name, website, industry and location. Takes a minute." },
  { title: "Connect your accounts", body: "Link your social pages, Google Business Profile and ads account." },
  { title: "Let AI run it", body: "AI posts, replies and optimizes. You check in when you like." },
]

const FAQS = [
  { question: "How does the free trial work?", answer: `You get ${TRIAL_DAYS} days of every Marketing feature with no card needed. Pick a plan any time to keep going.` },
  { question: "Do I need to know marketing?", answer: "No. AI does the work and explains each step in plain words. You decide how much you want to approve before it goes out." },
  { question: "Does AI post without asking me?", answer: "Only if you let it. You can approve every post and reply, or let AI publish on its own schedule." },
  { question: "Which plan is right for me?", answer: "Essential covers social and SEO. Pro adds reviews. Advanced adds Google Ads. You can move up as you grow." },
  { question: "How does ad spend work?", answer: "Your plan covers the tools. The money you spend on Google ads is paid to Google separately, and you set the budget." },
  { question: "Can your team do it for me instead?", answer: "Yes. Our Growth plans put our team on your marketing, and every Growth plan includes Marketing Advanced." },
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
              <p className="mb-4 text-sm font-medium opacity-70">VisualCNS Marketing Suite</p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
                Your marketing, run by AI.
              </h1>
              <p className="mt-6 max-w-md text-lg opacity-85">
                AI writes your posts, works your SEO, answers your reviews and runs your ads. You run your business.
              </p>
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
            <ul className="space-y-3 rounded-3xl border border-background/15 bg-background/5 p-6 md:p-8">
              {TASKS.map((task) => (
                <li key={task} className="flex items-center gap-3 text-sm md:text-base">
                  <span className="size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                  {task}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Products */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="max-w-2xl font-semibold tracking-tight">Six tools. One dashboard. AI does the work.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Stop switching between apps. Every part of your marketing lives in one place, and AI keeps it moving.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <div key={product.name} className="rounded-2xl border border-border p-6">
                <product.icon className="size-5 text-primary" aria-hidden />
                <p className="mt-4 text-sm font-medium text-muted-foreground">{product.name}</p>
                <h3 className="mt-1 text-lg font-semibold">{product.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{product.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="scroll-mt-24 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="font-semibold tracking-tight">Plans that grow with you</h2>
            <p className="mb-8 mt-4 max-w-2xl text-muted-foreground">Start free for {TRIAL_DAYS} days. Move up a plan when you need more.</p>
            <AuthProvider>
              <PricingView cartHref="/cart" freeHref={START_HREF} only="Marketing" />
            </AuthProvider>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="font-semibold tracking-tight">Up and running in minutes</h2>
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
            <h2 className="font-semibold tracking-tight">Questions</h2>
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
            <h2 className="font-semibold tracking-tight">Let AI take marketing off your plate</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">Free for {TRIAL_DAYS} days. No card needed.</p>
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
