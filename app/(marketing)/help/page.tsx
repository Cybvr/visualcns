import type { Metadata } from "next"

import { Header } from "@/components/header"
import { HelpChat } from "./help-chat"

export const metadata: Metadata = {
  title: "Help | VisualCNS",
  description: "Ask Ngai anything about VisualCNS: our services, plans, Pass, Pulse and how to get started.",
}

export default function HelpPage() {
  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-2 pb-4 pt-24 sm:px-6">
        <HelpChat />
      </main>
    </div>
  )
}
