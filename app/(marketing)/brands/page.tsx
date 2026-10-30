import { publicPageMetadata } from "@/lib/public-page-metadata"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getBrandItems } from "@/lib/brands"

export const metadata = publicPageMetadata({
  title: "Brands | VisualCNS",
  description: "Discover the product businesses and brands in the VisualCNS ecosystem.",
  path: "/brands",
})

export default function BrandsPage() {
  const items = getBrandItems()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-6 pb-24 pt-32">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Brands</p>
          <h1 className="mt-5 max-w-4xl text-balance text-5xl font-normal tracking-normal md:text-7xl">
            The VisualCNS brands are the <span className="text-accent">product ecosystem</span>.
          </h1>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <Link 
                key={item.slug} 
                href={item.href} 
                className="group relative flex flex-col justify-between rounded-[2rem] border border-border bg-card p-8 transition-all hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/10"
              >
                <div>
                  <div className="mb-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-secondary/50 p-2">
                    <Image
                      src={item.logo}
                      alt={`${item.name} logo`}
                      width={48}
                      height={48}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {item.product}
                  </p>
                  <h2 
                    className="mt-4 text-3xl font-semibold transition-colors"
                    style={{ color: item.color }}
                  >
                    {item.name}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ArrowUpRight className="mt-8 size-7 text-accent transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
