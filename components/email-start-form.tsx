"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Email box that starts sign-up and onboarding with the address already filled in. */
export function EmailStartForm({ className, inputClassName, id = "start-email" }: { className?: string; inputClassName?: string; id?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    router.push(value ? `/signup?email=${encodeURIComponent(value)}` : "/signup")
  }

  return (
    <form onSubmit={submit} className={cn("flex w-full max-w-md items-center gap-1 rounded-full border p-1", className)}>
      <label htmlFor={id} className="sr-only">Work email</label>
      <input
        id={id}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your work email"
        className={cn("h-10 min-w-0 flex-1 bg-transparent px-4 text-base outline-none", inputClassName)}
      />
      <Button type="submit" size="lg" className="shrink-0 rounded-full">Get started</Button>
    </form>
  )
}
