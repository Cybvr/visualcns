"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { NGAI_APP_URL } from "@/lib/ngai"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const EXAMPLES = [
  "A booking site for my hair salon with online payments",
  "A dashboard that tracks my shop's daily sales",
  "A portfolio for my photography with a contact form",
]

/** Plain GET form: the browser encodes the prompt as ?prompt=… on the builder URL. */
export function NgaiPromptBox() {
  const [prompt, setPrompt] = useState("")

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form action={NGAI_APP_URL} method="get" className="rounded-2xl border border-border bg-background p-3 text-left shadow-sm">
        <label htmlFor="ngai-prompt" className="sr-only">
          Describe what you want to build
        </label>
        <Textarea
          id="ngai-prompt"
          name="prompt"
          required
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the app or website you want to build…"
          className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!prompt.trim()}>
            <Sparkles />
            Generate
          </Button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <Button key={example} type="button" variant="outline" size="sm" onClick={() => setPrompt(example)}>
            {example}
          </Button>
        ))}
      </div>
    </div>
  )
}
