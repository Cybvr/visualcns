import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getBlogPostBySlug, getBlogPosts } from "@/lib/blog"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) return {}
  return publicPageMetadata({
    title: `${post.title} | VisualCNS`,
    description: post.excerpt,
    path: `/blog/${slug}`,
    ...(post.image ? { image: post.image } : {}),
  })
}

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) notFound()

  const relatedPosts = getBlogPosts()
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((a, b) => {
      const aMatch = a.categories.some((category) => post.categories.includes(category))
      const bMatch = b.categories.some((category) => post.categories.includes(category))
      return Number(bMatch) - Number(aMatch)
    })
    .slice(0, 5)

  const byline = post.author === post.source ? post.author : `${post.author} · ${post.source}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-12 md:px-20">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
          <article>
            <Link href="/blog" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-accent">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Blog
            </Link>

            <header className="mt-10 max-w-4xl">
              <p className="text-xs uppercase tracking-[0.14em] text-accent">{post.categories.join(" · ")}</p>
              <h1 className="mt-3 text-5xl leading-[0.95] tracking-[-0.03em] md:text-7xl">{post.title}</h1>
              <p className="mt-6 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {post.date}
                {post.readTime ? ` · ${post.readTime}` : null}
              </p>
            </header>

            {post.image ? (
              <figure className="mt-12">
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <Image
                    src={post.image}
                    alt={post.imageAlt ?? post.title}
                    fill
                    priority
                    sizes="(min-width: 1280px) 832px, (min-width: 1024px) calc(100vw - 26rem), 100vw"
                    className="object-cover"
                    style={{ objectPosition: post.imagePosition }}
                  />
                </div>
                {post.imageCredit ? (
                  <figcaption className="mt-2 text-xs text-muted-foreground">Image: {post.imageCredit}</figcaption>
                ) : null}
              </figure>
            ) : null}

            <div className="mt-10 max-w-2xl">
              <p className="text-xl leading-8 text-foreground">{post.excerpt}</p>
              {post.body ? (
                <div className="mt-10">
                  {post.body.map((section, i) => (
                    <section key={i} className="mt-10 first:mt-0">
                      {section.heading ? <h2 className="mb-4 text-3xl tracking-[-0.02em]">{section.heading}</h2> : null}
                      {section.paragraphs.map((paragraph, j) => (
                        <p key={j} className="mt-4 leading-7 text-muted-foreground first:mt-0">{paragraph}</p>
                      ))}
                    </section>
                  ))}
                </div>
              ) : (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 text-sm uppercase tracking-[0.14em] transition-colors hover:text-accent"
                >
                  Read the full article
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              )}
              <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">By {byline}</p>
            </div>
          </article>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border-t border-border pt-5">
              <h2 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">More articles</h2>
              <nav aria-label="More articles" className="mt-5">
                <ul>
                  {relatedPosts.map((relatedPost) => (
                    <li key={relatedPost.slug} className="border-t border-border py-5 last:border-b">
                      <Link href={`/blog/${relatedPost.slug}`} className="group block">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors group-hover:text-accent">
                          {relatedPost.categories[0]}
                        </p>
                        <h3 className="mt-2 text-xl leading-tight tracking-[-0.01em] transition-colors group-hover:text-accent">
                          {relatedPost.title}
                        </h3>
                        <p className="mt-3 text-xs text-muted-foreground">{relatedPost.date}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
