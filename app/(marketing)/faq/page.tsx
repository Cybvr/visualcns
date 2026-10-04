import type { Metadata } from "next"
import Link from "next/link"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export const metadata: Metadata = {
  title: "FAQ | VisualCNS",
  description: "Answers to common questions about VisualCNS, our services, and how we work.",
}

const faqs = [
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

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-4 pb-24 pt-32 sm:px-8 md:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="text-balance text-5xl tracking-[-0.03em] md:text-7xl">Frequently Asked Questions</h1>
          </div>

          <Accordion type="multiple" className="mt-20 max-w-5xl">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`}>
                <AccordionTrigger className="gap-6 py-6 text-xl tracking-[-0.02em] hover:no-underline md:text-3xl">
                  <span className="text-left">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="max-w-3xl pb-7 text-base leading-7 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
      <Footer />
    </div>
  )
}
