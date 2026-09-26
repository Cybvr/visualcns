"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Pause, Play, RotateCcw } from "lucide-react"

import { BookNowModal } from "@/components/book-now-modal"
import { Button } from "@/components/ui/button"
import type { CompanyLink } from "@/lib/organizations"
import { cn } from "@/lib/utils"

type Source = { label: string; url: string }
type Finding = { tone: "fix" | "good"; title: string; proof: string; source: string }
type Audit = { grade: string; verdict: string; findings: Finding[] }

const SOCIAL = /instagram|facebook|twitter|x\.com|tiktok|linkedin/i

function hostOf(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]
}

// Prototype data. Swap for the model's response once the audit route exists.
function prototypeAudit(website: Source | undefined, social: Source | undefined): Audit {
  if (!website && !social) {
    website = { label: "Website", url: "Website" }
    social = { label: "Instagram", url: "instagram.com" }
  }
  if (website && social) {
    return {
      grade: "B-",
      verdict: `Strong website. ${social.label} tells a different story.`,
      findings: [
        { tone: "fix", title: `${social.label} looks like a different company`, proof: "Old logo and colours on the last 9 posts.", source: social.label },
        { tone: "fix", title: "Homepage doesn't say what you sell", proof: "Services are three scrolls down.", source: hostOf(website.url) },
        { tone: "good", title: "Logo used the same way on the website", proof: "Clean, consistent, easy to read.", source: hostOf(website.url) },
      ],
    }
  }
  if (website) {
    return {
      grade: "C+",
      verdict: "Good website, but nobody can find you on social.",
      findings: [
        { tone: "fix", title: "No active social profile", proof: "People checking you out find nothing.", source: "Social" },
        { tone: "fix", title: "Homepage doesn't say what you sell", proof: "Services are three scrolls down.", source: hostOf(website.url) },
        { tone: "good", title: "Clean, modern website", proof: "Loads fast and looks current.", source: hostOf(website.url) },
      ],
    }
  }
  return {
    grade: "C",
    verdict: "Active on social, but no website to send people to.",
    findings: [
      { tone: "fix", title: "No website", proof: "Interested customers have nowhere to go.", source: "Website" },
      { tone: "fix", title: "Bio doesn't say what you do", proof: "Nine words, none about the offer.", source: social!.label },
      { tone: "good", title: "Posting regularly", proof: "Three posts a week for two months.", source: social!.label },
    ],
  }
}

function spokenSummary(companyName: string, audit: Audit) {
  const fixes = audit.findings.filter((finding) => finding.tone === "fix")
  return [
    `${companyName} brand check. Grade ${audit.grade}.`,
    audit.verdict,
    `${fixes.length} thing${fixes.length === 1 ? "" : "s"} to fix.`,
    ...fixes.map((finding) => `${finding.title}. ${finding.proof}`),
  ].join(" ")
}

export function BrandHealthCheck({
  companyName,
  website,
  linkedIn,
  links = [],
}: {
  companyName: string
  description?: string
  website?: string
  linkedIn?: string
  links?: CompanyLink[]
}) {
  const [checkedAt, setCheckedAt] = useState(() => new Date())
  const [checking, setChecking] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const audit = useMemo(() => {
    const sources: Source[] = [
      linkedIn ? { label: "LinkedIn", url: linkedIn } : null,
      ...links.map((link) => ({ label: link.label, url: link.url })),
    ].filter((source): source is Source => Boolean(source?.url?.trim()))
    const socials = sources.filter((source) => SOCIAL.test(`${source.label} ${source.url}`))
    const social = socials.find((source) => /instagram/i.test(`${source.label} ${source.url}`)) ?? socials[0]
    return prototypeAudit(website?.trim() ? { label: "Website", url: website } : undefined, social)
  }, [links, linkedIn, website])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  function recheck() {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    setChecking(true)
    window.setTimeout(() => {
      setCheckedAt(new Date())
      setChecking(false)
    }, 1200)
  }

  function toggleListen() {
    if (!("speechSynthesis" in window)) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(spokenSummary(companyName, audit))
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  if (checking) {
    return (
      <section className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <p className="text-sm">Checking {companyName}…</p>
      </section>
    )
  }

  return (
    <section className="mx-auto mt-6 max-w-md">
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-foreground text-2xl font-semibold text-background">
          {audit.grade}
        </div>
        <p className="text-sm text-muted-foreground">
          Brand check · {checkedAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
        </p>
      </div>

      <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground">{audit.verdict}</h2>

      <Button type="button" variant="outline" size="lg" className="mt-5 w-full" onClick={toggleListen}>
        {speaking ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
        {speaking ? "Stop" : "Listen"}
      </Button>

      <ul className="mt-8 space-y-5">
        {audit.findings.map((finding) => (
          <li key={finding.title} className="flex gap-3">
            <span
              className={cn("mt-2 size-2 shrink-0 rounded-full", finding.tone === "fix" ? "bg-red-500" : "bg-emerald-500")}
              aria-label={finding.tone === "fix" ? "Fix" : "Good"}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug text-foreground">{finding.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{finding.proof}</p>
            </div>
            <div className="w-16 shrink-0" aria-hidden="true">
              <div className="aspect-[3/4] space-y-1 rounded-md bg-muted p-1.5">
                <div className="h-1.5 w-3/4 rounded-sm bg-foreground/15" />
                <div className="h-6 rounded-sm bg-foreground/10" />
                <div className="h-1 w-full rounded-sm bg-foreground/10" />
                <div className="h-1 w-2/3 rounded-sm bg-foreground/10" />
              </div>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">{finding.source}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <BookNowModal triggerLabel="Fix this with us" triggerSize="lg" triggerClassName="w-full" />
      </div>

      <Button type="button" variant="ghost" size="sm" className="mx-auto mt-3 flex text-muted-foreground" onClick={recheck}>
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Check again
      </Button>
    </section>
  )
}
