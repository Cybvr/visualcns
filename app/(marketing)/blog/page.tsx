import { publicPageMetadata } from "@/lib/public-page-metadata"

import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { getBlogCategories, getBlogPosts } from "@/lib/blog"

export const metadata = publicPageMetadata({
  title: "VisualCNS Blog",
  description: "Ideas and stories about brands, software, products, and business from VisualCNS.",
  path: "/blog",
})

const posts = getBlogPosts()
const categories = getBlogCategories()

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active = categories.find((c) => c === category)
  const visible = active ? posts.filter((post) => post.categories.includes(active)) : posts

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-8 md:px-20 md:pt-32">
        <h1 className="mb-6 text-4xl tracking-[-0.03em] md:mb-8 md:text-5xl">Blog</h1>

        {/* One scrolling row on phones so the filters never push the posts off screen; wraps on wider screens. */}
        <nav aria-label="Blog categories" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 md:mx-0 md:mb-12 md:flex-wrap md:overflow-visible md:px-0">
          <Link
            href="/blog"
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              !active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/blog?category=${encodeURIComponent(c)}`}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {c}
            </Link>
          ))}
        </nav>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
              <Card className="h-full gap-0 overflow-hidden bg-transparent p-0 text-left transition-colors hover:border-primary">
                {post.image ? (
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <Image
                      src={post.image}
                      alt={post.imageAlt ?? post.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                      style={{ objectPosition: post.imagePosition }}
                    />
                  </div>
                ) : (
                  <div aria-hidden className="flex aspect-[16/10] items-center justify-center bg-muted">
                    <img src="/logoblue.svg" alt="" className="w-1/3 opacity-40" />
                  </div>
                )}
                <CardHeader className="py-6 text-left">
                  <p className="text-xs uppercase tracking-[0.14em] text-primary">
                    {post.categories.join(" · ")}
                  </p>
                  <CardTitle className="mt-2 text-base font-normal">{post.title}</CardTitle>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {post.date}
                    {post.readTime ? ` · ${post.readTime}` : null}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
