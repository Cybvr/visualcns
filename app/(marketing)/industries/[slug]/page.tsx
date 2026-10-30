import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { getIndustries, getIndustryBySlug } from "@/lib/industries"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const industry = getIndustryBySlug(slug)
  if (!industry) return {}
  return publicPageMetadata({
    title: `${industry.name} | VisualCNS`,
    description: industry.description,
    path: `/industries/${slug}`,
  })
}

export function generateStaticParams() {
  return getIndustries().map((industry) => ({ slug: industry.slug }))
}

export default async function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const industry = getIndustryBySlug(slug)

  if (!industry) notFound()

  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-12 pb-24 pt-32 md:px-20">
        <div className="mx-auto max-w-4xl">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/industries">
              <ArrowLeft className="size-4" />
              Industries
            </Link>
          </Button>
          <p className="mt-12 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Industry</p>
          <h1 className="mt-5 text-balance text-5xl font-semibold tracking-normal md:text-7xl">{industry.name}</h1>
          <p className="mt-8 text-xl leading-8 text-muted-foreground">{industry.description}</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
