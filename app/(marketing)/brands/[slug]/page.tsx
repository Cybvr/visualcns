import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { getBrandItemBySlug, getBrandItems } from "@/lib/brands"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = getBrandItemBySlug(slug)
  if (!brand) return {}
  return publicPageMetadata({
    title: `${brand.name} | VisualCNS`,
    description: brand.description,
    path: `/brands/${slug}`,
  })
}

export function generateStaticParams() {
  return getBrandItems().map((item) => ({ slug: item.slug }))
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = getBrandItemBySlug(slug)
  const allBrands = getBrandItems()
  const otherBrands = allBrands.filter((b) => b.slug !== slug)

  if (!item) notFound()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-6 pb-24 pt-32">
        <div className="mx-auto max-w-7xl">
          <Button variant="ghost" size="sm" asChild className="mb-12">
            <Link href="/brands">
              <ArrowLeft className="mr-2 size-4" />
              Back to Brands
            </Link>
          </Button>

          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-secondary/50 p-3">
                <Image
                  src={item.logo}
                  alt={`${item.name} logo`}
                  width={64}
                  height={64}
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {item.product}
              </p>
              <h1 
                className="mt-5 text-balance text-5xl font-semibold tracking-normal md:text-7xl"
                style={{ color: item.color }}
              >
                {item.name}
              </h1>
              <p className="mt-8 text-xl leading-8 text-muted-foreground max-w-xl">
                {item.content || item.description}
              </p>
              <div className="mt-10">
                <Button 
                  asChild 
                  size="lg" 
                  className="rounded-full px-8 text-white border-none"
                  style={{ backgroundColor: item.color }}
                >
                  {item.websiteUrl.startsWith("/") ? (
                    <Link href={item.websiteUrl}>
                      {item.slug === "visualhq" ? "View Case Studies" : "Visit Website"}
                      <ArrowUpRight className="ml-2 size-4" />
                    </Link>
                  ) : (
                    <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer">
                      Visit Website
                      <ExternalLink className="ml-2 size-4" />
                    </a>
                  )}
                </Button>
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2.5rem] bg-secondary/30 border border-border">
              {item.screenshot ? (
                <Image
                  src={item.screenshot}
                  alt={`${item.name} screenshot`}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Brand Showcase</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50 pointer-events-none" />
            </div>
          </div>

          <section className="mt-32">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-semibold tracking-tight">More Brands</h2>
              <Button variant="ghost" asChild>
                <Link href="/brands">
                  View all <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {otherBrands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={brand.href}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-border bg-card p-8 transition-all hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/10"
                >
                  <div>
                    <div className="mb-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-secondary/50 p-2">
                      <Image
                        src={brand.logo}
                        alt={`${brand.name} logo`}
                        width={48}
                        height={48}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      {brand.product}
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold">{brand.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {brand.description}
                    </p>
                  </div>
                  <div className="mt-8 flex items-center text-sm font-medium text-accent opacity-0 transition-all group-hover:opacity-100">
                    View Project <ArrowUpRight className="ml-1 size-4" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
