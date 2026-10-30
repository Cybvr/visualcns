import { publicPageMetadata } from "@/lib/public-page-metadata"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PageHeading } from "@/components/page-heading"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Target, Users, Lightbulb, Globe } from "lucide-react"
import { getTeamMembers, type TeamMember } from "@/lib/team"

export const metadata = publicPageMetadata({
  title: "About VisualCNS",
  description: "Meet VisualCNS, a Lagos-based team building software systems, product businesses, and AI tools.",
  path: "/about",
})

const values = [
  {
    icon: Target,
    title: "Purpose-Driven",
    description: "Every design decision is guided by clear objectives and measurable outcomes.",
  },
  {
    icon: Users,
    title: "Collaborative",
    description: "We work closely with our clients, treating each project as a true partnership.",
  },
  {
    icon: Lightbulb,
    title: "Innovative",
    description: "We stay ahead of trends while focusing on timeless design principles.",
  },
  {
    icon: Globe,
    title: "Global Standards",
    description: "Local expertise meets international quality and best practices.",
  },
]

const team = getTeamMembers()

function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Open profile for ${member.name}`} className="group block w-full text-left outline-none">
          <div className="aspect-square overflow-hidden rounded-lg bg-muted">
            <img
              src={member.image || "/placeholder.svg"}
              alt={member.name}
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>
          <h3 className="mt-5 text-lg font-semibold transition-colors group-hover:text-accent">{member.name}</h3>
          <p className="text-xs text-accent">{member.role}</p>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl overflow-hidden rounded-none border-0 p-0">
        <div className="grid max-h-[calc(100vh-2rem)] overflow-y-auto md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-h-72 bg-muted md:min-h-full">
            <img
              src={member.image || "/placeholder.svg"}
              alt={member.name}
              className="size-full min-h-72 object-cover md:min-h-[32rem]"
            />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10 md:p-12">
            <DialogHeader>
              <p className="text-sm text-accent">{member.role}</p>
              <DialogTitle className="mt-2 text-4xl tracking-[-0.03em] sm:text-5xl">{member.name}</DialogTitle>
            </DialogHeader>
            <DialogDescription className="mt-8 whitespace-pre-line text-base leading-7 text-muted-foreground">
              {member.description}
            </DialogDescription>
            {member.profileUrl && (
              <a
                href={member.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex w-fit items-center gap-2 border-b border-foreground pb-1 text-sm transition-colors hover:border-accent hover:text-accent"
              >
                View external profile
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TeamLightbox() {
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
      {team.map((member) => (
        <TeamMemberCard key={member.name} member={member} />
      ))}
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="px-4 pb-20 pt-32 sm:px-8 md:px-20">
        <div className="max-w-7xl mx-auto">
          <PageHeading
            title={
              <>
                Building brands that <span className="text-accent">matter</span>
              </>
            }
            subtitle="A global creative consultancy that develops digital experiences, brand systems, and technology solutions for modern businesses."
          />
        </div>
      </section>

      {/* Story Section */}
      <section className="bg-secondary px-4 py-20 sm:px-8 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Founded in Lagos, Nigeria, VisualHQ emerged from a passion for design excellence and technical
                  innovation. We recognized that businesses in our region deserved world-class creative services without
                  compromising on quality or understanding.
                </p>
                <p>
                  Today, we've grown into a team of dedicated designers and developers who combine local market
                  knowledge with global standards. We've helped startups launch, established businesses rebrand, and
                  enterprises scale their digital presence.
                </p>
                <p>
                  Our location in Lagos gives us unique insight into the African market while our commitment to
                  excellence ensures we deliver work that stands up anywhere in the world.
                </p>
              </div>
            </div>
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pexels-eniforo-kelvin-2147697922-29715199-xWkruvbP3vXKzdsjBdSomWtqM5Y8r7.jpg" alt="VisualHQ Office" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="px-4 py-20 sm:px-8 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <p className="text-sm font-medium text-muted-foreground mb-2">Our Approach</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title}>
                <value.icon className="w-10 h-10 mb-4" />
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="bg-secondary px-4 py-20 sm:px-8 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <p className="text-sm font-medium text-muted-foreground mb-2">Our Team</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold">The people behind the work</h2>
          </div>
          <TeamLightbox />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-8 md:px-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Let's work together</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            We're always excited to collaborate with ambitious brands and businesses.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">
              Get in Touch
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
