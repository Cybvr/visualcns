import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PageHeading } from "@/components/page-heading"
import { Button } from "@/components/ui/button"
import { customerStories } from "@/lib/stories"

export const metadata: Metadata = {
  title: "Stories | VisualCNS",
  description: "Stories from the people and businesses VisualCNS works with.",
}

export default function StoriesPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="px-4 pb-20 pt-32 sm:px-8 md:px-20">
          <div className="mx-auto max-w-7xl">
            <PageHeading
              title="Stories from the work"
              subtitle="A growing collection of the people, products, and businesses we have the privilege to build with."
            />
          </div>
        </section>

        <section className="bg-secondary px-4 py-20 sm:px-8 md:px-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Customer stories</p>
              <h2 className="font-serif text-3xl font-bold md:text-4xl">What the work makes possible</h2>
            </div>

            <div aria-label="Customer stories" className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {customerStories.map((story) => (
                <article key={story.id} className="flex aspect-square min-h-0 flex-col rounded-lg bg-background p-6 sm:p-8">
                  <div className="flex items-center gap-4">
                    <Image
                      src={story.logoUrl}
                      alt={story.brandName}
                      width={160}
                      height={48}
                      className="h-10 w-auto max-w-[9rem] object-contain object-left"
                    />
                    <h6 className="text-xl tracking-tight">{story.brandName}</h6>
                  </div>

                  <blockquote className="mt-auto pt-8 text-base leading-7 tracking-normal text-foreground">
                    {story.quote}
                  </blockquote>

                  <div className="mt-8 flex items-center gap-3">
                    <Image
                      src={story.avatarUrl}
                      alt=""
                      width={96}
                      height={96}
                      className="size-16 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-base font-semibold tracking-[-0.01em]">{story.personName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{story.personRole}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-8 md:px-20">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">Have a story to build?</h2>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
              Bring us the question, the ambition, or the unfinished idea. We will help shape what comes next.
            </p>
            <Button size="lg" asChild>
              <Link href="/contact">
                Start a conversation
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
