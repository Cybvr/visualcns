"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { getCaseStudyProjectBySlug, getCaseStudyProjects, type CaseStudyProject } from "@/lib/case-studies"
import { Skeleton } from "@/components/ui/skeleton"

const PLACEHOLDER = "/placeholder.svg?height=900&width=1600&query=project"
const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-8 md:px-20"
const LABEL = "font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground"

export default function SingleProjectPage() {
  const params = useParams()
  const slug = params.slug as string
  const [project, setProject] = useState<CaseStudyProject | null>(null)
  const [relatedProjects, setRelatedProjects] = useState<CaseStudyProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProject() {
      try {
        const data = await getCaseStudyProjectBySlug(slug)
        setProject(data)

        const all = await getCaseStudyProjects()
        const related = all
          .filter((p) => p.slug !== slug)
          .slice(0, 3)
        setRelatedProjects(related)
      } catch (error) {
        console.error("Error fetching project:", error)
      } finally {
        setLoading(false)
      }
    }
    if (slug) fetchProject()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-24 sm:px-8 md:px-20" role="status" aria-label="Loading case study">
          <Skeleton className="h-10 w-2/3" /><Skeleton className="h-96 w-full" /><Skeleton className="h-5 w-1/2" />
        </div>
        <Footer />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className={`${CONTAINER} pb-16 pt-28 text-center md:pb-20 md:pt-32`}>
          <h1 className="mb-4 text-4xl">Project Not Found</h1>
          <p className="mb-8 text-muted-foreground">The project you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/case-studies">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Case Studies
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    )
  }

  // Only the fields this project actually carries reach the rail.
  const facts = [
    { label: "Client", value: project.client },
    { label: "Category", value: project.category?.join(" & ") },
    { label: "Industry", value: project.industry },
    { label: "Location", value: project.location },
    { label: "Founders", value: project.founders },
    { label: "Valuation", value: project.clientValuation },
  ].filter((fact) => Boolean(fact.value))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <section className={`${CONTAINER} pb-6 pt-24 md:pt-28`}>
        <Link href="/case-studies" className={`${LABEL} transition-colors hover:text-accent`}>
          ← Case Studies
        </Link>
      </section>

      {/* Full-bleed hero. The work is the first thing on the page. */}
      <section className="h-[52vh] min-h-[20rem] overflow-hidden bg-muted md:h-[74vh]">
        <img src={project.imageUrl || PLACEHOLDER} alt={project.title} className="h-full w-full object-cover" />
      </section>

      {/* Title notches into the lower-left of the hero, aligned to the text grid. */}
      <section className={CONTAINER}>
        <div className="pf-hero-title relative z-10 -mt-14 inline-block max-w-full pr-8 pt-7 md:-mt-24 md:pr-14 md:pt-12">
          <h1 className="text-balance text-4xl tracking-[-0.02em] md:text-6xl lg:text-7xl">{project.title}</h1>
        </div>
      </section>

      <section className={`${CONTAINER} pb-20 md:pb-28`}>
        <div className="grid gap-x-16 border-t border-border pt-10 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:pt-14 lg:gap-x-24">
          <aside className="md:sticky md:top-28 md:self-start">
            <dl>
              {facts.map((fact) => (
                <div key={fact.label} className="border-t border-border py-4 first:border-t-0 first:pt-0">
                  <dt className={LABEL}>{fact.label}</dt>
                  <dd className="mt-2 text-base">{fact.value}</dd>
                </div>
              ))}
            </dl>

            {project.technologies?.length ? (
              <div className="mt-6 border-t border-border pt-4">
                <p className={LABEL}>Technologies</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <li
                      key={tech}
                      className="border border-border px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {project.projectUrl && (
              <Button className="mt-8 w-full md:w-auto" asChild>
                <a href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                  Visit Live Site
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </aside>

          <div className="mt-12 md:mt-0">
            {project.excerpt && (
              <p className="max-w-[34ch] text-balance text-2xl leading-snug md:text-4xl md:leading-tight">
                {project.excerpt}
              </p>
            )}

            {project.description && (
              <p className="mt-8 max-w-[68ch] text-lg leading-8 text-muted-foreground">{project.description}</p>
            )}

            {project.gallery?.length ? (
              <section className="mt-16 md:mt-20">
                <h2 className={LABEL}>Project Gallery</h2>
                <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {project.gallery.map((image, index) => (
                    <li
                      key={image || index}
                      // Every third frame runs the full width, so the gallery has a cadence.
                      className={`pf-tile overflow-hidden bg-muted ${
                        index % 3 === 0 ? "aspect-[16/9] md:col-span-2" : "aspect-[4/3]"
                      }`}
                    >
                      <div className="pf-shot h-full w-full">
                        <img src={image || PLACEHOLDER} alt="" loading="lazy" />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      {relatedProjects.length > 0 && (
        <section className={`${CONTAINER} pb-20 md:pb-28`}>
          <h2 className={LABEL}>You might also like this</h2>
          <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
            {relatedProjects.map((related) => (
              <li key={related.id} className="pf-tile">
                <Link href={`/case-studies/${related.slug}`} className="group block outline-none">
                  <div className="pf-shot aspect-[4/3] overflow-hidden bg-muted">
                    <img src={related.imageUrl || PLACEHOLDER} alt="" loading="lazy" />
                  </div>
                  <div className="pf-rule mt-4 border-t border-border pt-3">
                    <h3 className="text-xl transition-colors group-hover:text-accent">{related.title}</h3>
                    {related.category?.length ? (
                      <p className={`mt-2 ${LABEL}`}>{related.category.join(" & ")}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-foreground px-4 py-16 text-primary-foreground sm:px-8 md:px-20 md:py-20">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl tracking-tight md:text-4xl">Like what you see?</h2>
          <p className="mx-auto mb-8 max-w-xl text-primary-foreground/70">
            Let's discuss how we can create something amazing for your brand.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/contact">Start a Project</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
