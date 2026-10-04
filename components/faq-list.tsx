import type { ReactNode } from "react"
import Link from "next/link"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { naira, PLANS, TRIAL_DAYS } from "@/lib/subscription"

export type Faq = { question: string; answer: ReactNode }

/** Questions about the VisualCNS plans and products, for the Help page. */
export const PRODUCT_FAQS: Faq[] = [
  {
    question: "What plans do you have?",
    answer: `One VisualCNS plan in three sizes: Starter (${naira(PLANS.starter.monthlyNaira)} a month), Business (${naira(PLANS.business.monthlyNaira)} a month) and Pro (${naira(PLANS.pro.monthlyNaira)} a month). Pay yearly and get 2 months free. Every plan includes Pass, Pulse and Ngai, and starts with a ${TRIAL_DAYS}-day free trial.`,
  },
  {
    question: "What is Pass?",
    answer: "Pass is our visitor sign-in. Visitors sign in at reception on a tablet or on their own phone, the person they're visiting gets an email, and you always know who's in the building.",
  },
  {
    question: "What is Pulse?",
    answer: "A check-up on how your business shows up online. One scan looks at your website, search presence, competitors and market, then gives you a score and a list of what to fix first.",
  },
  {
    question: "What is Ngai?",
    answer: "Ngai is our assistant. Here it answers questions about VisualCNS. Signed in on your company page, it can also tell you about your own projects and invoices.",
  },
  {
    question: "How do I get started?",
    answer: (
      <>
        <Link href="/signup" className="text-foreground underline underline-offset-4 hover:text-accent">Create an account</Link> to start your free trial, or{" "}
        <Link href="/contact" className="text-foreground underline underline-offset-4 hover:text-accent">book a call</Link> if you need us to build something.
      </>
    ),
  },
]

export function FaqList({ faqs, className, compact = false }: { faqs: Faq[]; className?: string; compact?: boolean }) {
  return (
    <Accordion type="multiple" className={className}>
      {faqs.map((faq, index) => (
        <AccordionItem key={faq.question} value={`faq-${index}`}>
          <AccordionTrigger className={compact ? "gap-6 py-5 text-left text-lg hover:no-underline" : "gap-6 py-6 text-xl tracking-[-0.02em] hover:no-underline md:text-3xl"}>
            <span className="text-left">{faq.question}</span>
          </AccordionTrigger>
          <AccordionContent className={compact ? "max-w-3xl pb-6 text-base leading-7 text-muted-foreground" : "max-w-3xl pb-7 text-base leading-7 text-muted-foreground"}>
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

/** General questions about VisualCNS, shared by the FAQ and Help pages. */
export const GENERAL_FAQS: Faq[] = [
  {
    question: "Who is VisualCNS?",
    answer:
      "VisualCNS is a global creative consultancy that develops digital experiences, brand systems, and technology solutions for modern businesses. We bring strategy, design, content, and technology together around the work that needs to move forward.",
  },
  {
    question: "What services does VisualCNS offer?",
    answer:
      "Our services span Brand Design, Product & Experience Design, Campaign & Content Design, CRM & Relationship Design, VisualCNS Ventures, AI Design, and Commerce Design. Each service can stand alone or be combined into one connected engagement.",
  },
  {
    question: "What makes VisualCNS different from other media agencies in Africa?",
    answer:
      "We connect creative thinking to practical delivery. That means a brand system can become a working interface, a campaign can connect to the customer journey, and an AI idea can be shaped into a useful product rather than a presentation alone.",
  },
  {
    question: "What region does VisualCNS cover?",
    answer:
      "We work globally, with roots in Lagos and a strong understanding of African markets. Our engagements can support local, regional, and international teams wherever the work needs to happen.",
  },
  {
    question: "Do you collaborate with international brands looking to enter Africa?",
    answer:
      "Yes. We help international teams understand the market, adapt their brand and customer experience, and build the right local context into their entry strategy without losing the strength of the global system.",
  },
  {
    question: "How do you approach influencer marketing?",
    answer:
      "We start with the audience, the message, and the role creators need to play—not a list of follower counts. We can shape the strategy, identify the right partners, direct the content, coordinate delivery, and use performance signals to improve the work over time.",
  },
  {
    question: "Can you provide examples of brands you have worked with?",
    answer: (
      <>
        Yes. You can explore selected work in our{" "}
        <Link href="/case-studies" className="text-foreground underline underline-offset-4 hover:text-accent">
          case studies
        </Link>
        . For a relevant example, share the kind of problem you are solving and we will point you to the closest work.
      </>
    ),
  },
  {
    question: "Do you work with both startups and big brands?",
    answer:
      "Yes. We work with teams at different stages, from startups defining their first product or identity to established businesses evolving a complex brand, customer experience, or technology ecosystem.",
  },
  {
    question: "Do you provide media strategy or only execution?",
    answer:
      "Both. We can define the audience, channel role, message, measurement approach, and creative direction, then support the production and activation needed to put the plan into market.",
  },
  {
    question: "How long does it take to launch a campaign?",
    answer:
      "It depends on the scope, number of markets, production needs, and approvals. A focused campaign can move in a few weeks; integrated work across platforms and countries needs more time for strategy, creation, testing, and rollout.",
  },
  {
    question: "Who makes up the VisualCNS team?",
    answer:
      "Our work brings together strategists, designers, developers, technologists, content specialists, and trusted partners. The team is assembled around the needs of each engagement so the right expertise is involved at the right time.",
  },
  {
    question: "What is the typical budget range for a marketing campaign?",
    answer:
      "There is no useful one-size-fits-all range. Budget depends on the ambition, markets, channels, production, media, and timeline. We scope the work clearly, separate strategy, production, and activation costs, and recommend an approach that fits the opportunity.",
  },
  {
    question: "Can VisualCNS handle cross-country campaigns?",
    answer:
      "Yes. We can build a central strategy and campaign system, then adapt the work for different countries, audiences, languages, channels, and cultural contexts while keeping the brand coherent.",
  },
  {
    question: "What industries benefit most from your influencer network?",
    answer:
      "Creator-led work can be useful across consumer, commerce, technology, finance, health, lifestyle, and culture. The right fit depends less on the category and more on whether the audience trusts the creator and the brief gives them something meaningful to say.",
  },
  {
    question: "What is your approach to reputation management?",
    answer:
      "We combine listening, clear positioning, response planning, content, and ongoing signals from the market. The goal is to help teams respond with context and consistency, while addressing the underlying experience when the issue is bigger than communications.",
  },
  {
    question: "Why should I trust VisualCNS with my brand?",
    answer:
      "Because we take the work from intent to application. We make decisions visible, keep scope and trade-offs clear, and design systems that teams can actually use after launch. The result should be work that performs in the real world, not just work that looks good in a review.",
  },
  {
    question: "How can I get in touch with VisualCNS?",
    answer: (
      <>
        Start with our{" "}
        <Link href="/contact" className="text-foreground underline underline-offset-4 hover:text-accent">
          contact page
        </Link>
        , or email us at{" "}
        <a href="mailto:hello@visualcns.com" className="text-foreground underline underline-offset-4 hover:text-accent">
          hello@visualcns.com
        </a>
        . Tell us what you are building, where you are in the process, and what kind of help you need.
      </>
    ),
  },
]

