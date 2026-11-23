"use client"

import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Email addresses as pills. Type an address and press Enter, comma or space, or pick
 * one of the suggestions below. Backspace in an empty box removes the last pill.
 */
export function EmailPillInput({ id, value, onChange, suggestions = [], placeholder = "Add an email", disabled }: {
  id?: string
  value: string[]
  onChange: (emails: string[]) => void
  /** People to pick from, e.g. the client's contacts. */
  suggestions?: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const chosen = useMemo(() => new Set(value.map((email) => email.toLowerCase())), [value])

  const matches = useMemo(() => {
    const term = text.trim().toLowerCase()
    return suggestions
      .filter((option) => !chosen.has(option.value.toLowerCase()))
      .filter((option) => !term || option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term))
      .slice(0, 6)
  }, [suggestions, chosen, text])

  function add(raw: string) {
    const next = raw.split(/[\s,;]+/).map((part) => part.trim()).filter((part) => EMAIL.test(part) && !chosen.has(part.toLowerCase()))
    if (next.length) onChange([...value, ...next])
    setText("")
  }

  function remove(email: string) {
    onChange(value.filter((entry) => entry !== email))
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (["Enter", ",", " ", ";", "Tab"].includes(event.key) && text.trim()) {
      event.preventDefault()
      add(text)
    } else if (event.key === "Backspace" && !text && value.length) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      <div
        onClick={() => input.current?.focus()}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm",
          focused && "ring-2 ring-ring",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {value.map((email) => (
          <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5">
            <span className="truncate">{email}</span>
            <button type="button" onClick={(event) => { event.stopPropagation(); remove(email) }} aria-label={`Remove ${email}`} className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground">
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={input}
          id={id}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(event) => { event.preventDefault(); add(text + event.clipboardData.getData("text")) }}
          onFocus={() => setFocused(true)}
          // Let a click on a suggestion land before the list closes.
          onBlur={() => { setTimeout(() => setFocused(false), 120); if (text.trim()) add(text) }}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-[8rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {focused && matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {matches.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { onChange([...value, option.value]); setText("") }}
                className="w-full truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
