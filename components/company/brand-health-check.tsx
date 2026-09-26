"use client"

import { useMemo, useState } from "react"
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

type BrandHealthQuestion = {
  key: string
  label: string
  prompt: string
  context: string
}

const QUESTIONS: BrandHealthQuestion[] = [
  {
    key: "clarity",
    label: "Clarity",
    prompt: "Can a new visitor explain what you do in one sentence?",
    context: "A clear promise gives people a reason to stay, remember, and act.",
  },
  {
    key: "consistency",
    label: "Consistency",
    prompt: "Does your brand feel like the same business wherever people meet it?",
    context: "Consistency builds recognition without making every touchpoint identical.",
  },
  {
    key: "confidence",
    label: "Confidence",
    prompt: "Do your visible touchpoints make the right people feel ready to choose you?",
    context: "Trust grows when your proof, presentation, and promise agree.",
  },
  {
    key: "momentum",
    label: "Momentum",
    prompt: "Do you know the next brand improvement that would create the most movement?",
    context: "A focused next move is more useful than a long list of disconnected fixes.",
  },
]

const ANSWERS = [
  { label: "Yes, clearly", score: 3 },
  { label: "Mostly", score: 2 },
  { label: "Not yet", score: 1 },
] as const

function scoreLabel(score: number) {
  if (score >= 85) return "Strong foundation"
  if (score >= 65) return "Good, with room to sharpen"
  return "A useful place to start"
}

function nextMove(score: number) {
  if (score >= 85) return "Protect what is working, then make your strongest proof easier to find."
  if (score >= 65) return "Choose one high-visibility touchpoint and make the promise more consistent there."
  return "Start with the core promise. A sharper reason to choose you will make every later improvement work harder."
}

function scoreWidth(score: number) {
  return `${Math.round((score / 3) * 100)}%`
}

export function BrandHealthCheck({ companyName }: { companyName: string }) {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  const finished = started && step >= QUESTIONS.length
  const current = QUESTIONS[step]
  const overallScore = useMemo(() => {
    const values = Object.values(answers)
    if (!values.length) return 0
    return Math.round((values.reduce((sum, value) => sum + value, 0) / (QUESTIONS.length * 3)) * 100)
  }, [answers])

  function begin() {
    setStarted(true)
    setStep(0)
    setAnswers({})
  }

  function answer(value: number) {
    if (!current) return
    setAnswers((existing) => ({ ...existing, [current.key]: value }))
    setStep((currentStep) => currentStep + 1)
  }

  if (!started) {
    return (
      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Activity className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-5 max-w-xl text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
              Understand what is helping your brand move.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Take a free four-question check for {companyName}. You’ll get a calm snapshot of your brand’s current health and one practical place to focus next.
            </p>
            <Button type="button" className="mt-6" onClick={begin}>
              Start free health check
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="rounded-xl bg-muted/40 p-5 sm:p-6">
            <p className="text-sm font-medium text-foreground">The check looks at</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {QUESTIONS.map((question) => (
                <li key={question.key} className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  {question.label}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              No sign-up or score-chasing. Just a useful starting point for a better conversation.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (finished) {
    return (
      <section className="mt-5 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Your brand health snapshot</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">{scoreLabel(overallScore)}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A quick read for {companyName}, based on your answers today.</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-5 py-4 text-right text-emerald-950">
              <p className="text-3xl font-semibold tracking-[-0.04em]">{overallScore}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-800">out of 100</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {QUESTIONS.map((question) => {
              const score = answers[question.key] ?? 1
              return (
                <div key={question.key} className="rounded-xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{question.label}</span>
                    <span className="text-muted-foreground">{score}/3</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
                    <div className="h-full rounded-full bg-emerald-700" style={{ width: scoreWidth(score) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
          <p className="text-sm font-medium text-foreground">A sensible next move</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{nextMove(overallScore)}</p>
          <Button type="button" variant="outline" className="mt-5" onClick={begin}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Take the check again
          </Button>
        </div>
      </section>
    )
  }

  const progress = Math.round((step / QUESTIONS.length) * 100)
  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-foreground">Free brand health check</span>
        <span className="text-muted-foreground">{step + 1} of {QUESTIONS.length}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Health check progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-full rounded-full bg-emerald-700 transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-10 max-w-2xl">
        <p className="text-sm font-medium text-emerald-800">{current.label}</p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-3xl">{current.prompt}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{current.context}</p>
        <div className="mt-7 grid gap-2 sm:max-w-md">
          {ANSWERS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => answer(option.score)}
              className="flex min-h-12 items-center justify-between rounded-xl border border-border px-4 text-left text-sm font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {option.label}
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {step > 0 && (
        <button type="button" onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))} className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
      )}
    </section>
  )
}
