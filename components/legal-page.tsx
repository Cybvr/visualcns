import type { ReactNode } from "react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"

export type LegalSection = {
  id: string
  title: string
  content: ReactNode
}

type LegalPageProps = {
  title: string
  summary: string
  lastUpdated: string
  sections: LegalSection[]
}

export function LegalPage({ title, summary, lastUpdated, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-4 pb-24 pt-32 sm:px-8 md:px-20">
        <div className="mx-auto max-w-7xl">
          <header className="max-w-3xl">
            <h1 className="text-balance text-5xl tracking-[-0.03em] md:text-7xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{summary}</p>
            <p className="mt-4 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </header>

          <div className="mt-16 grid gap-12 border-t border-border pt-10 lg:grid-cols-[14rem_minmax(0,48rem)] lg:gap-20">
            <aside>
              <nav aria-label={`${title} sections`} className="lg:sticky lg:top-28">
                <p className="text-sm font-medium text-foreground">On this page</p>
                <ul className="mt-4 space-y-3">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <article className="min-w-0">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className={`scroll-mt-28 ${index === 0 ? "" : "mt-12 border-t border-border pt-12"}`}
                >
                  <h2 className="text-3xl tracking-[-0.02em] text-foreground">{section.title}</h2>
                  <div className="mt-5 space-y-4 text-base leading-7 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:text-primary [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                    {section.content}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
