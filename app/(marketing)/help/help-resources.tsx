import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

const RESOURCES = [
  { name: "Company", href: "/about", description: "Our story, values, and team." },
  { name: "News", href: "/blog", description: "Updates, guides, and announcements." },
  { name: "VisualHQ", href: "/visualhq", description: "Who we are and what we do." },
  { name: "Industries", href: "/industries", description: "The markets and sectors we build for." },
  { name: "Careers", href: "https://pasive.co/jobs", description: "Open roles across the team." },
]

export function HelpResources() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <ul className="border-t border-border">
        {RESOURCES.map((resource) => (
          <li key={resource.name} className="border-b border-border">
            <Link
              href={resource.href}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-2 py-5 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
            >
              <span className="min-w-0">
                <span className="block text-lg font-medium text-foreground">{resource.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{resource.description}</span>
              </span>
              <ArrowUpRight className="size-5 text-muted-foreground transition-[transform,color] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
