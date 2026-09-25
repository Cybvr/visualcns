"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type SearchResult = {
  /** Stable, unique across the whole result set (cmdk needs distinct values). */
  id: string
  /** Heading the result is grouped under, e.g. "Companies". */
  group: string
  label: string
  sublabel?: string
  href: string
  /** Extra text folded into the match, never shown. */
  keywords?: string
}

/** Turn stored HTML/markdown into plain text so a search never matches raw tags. */
export function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

/** Open the palette on Cmd/Ctrl+K from anywhere in the surface. */
export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpen()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onOpen])
}

/** The sidebar affordance that opens the palette: a faux input, or an icon in the collapsed rail. */
export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Search"
        className="relative flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-medium">Search</span>
        <kbd className="pointer-events-none ml-auto hidden select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>
      <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Search" aria-label="Search" onClick={onOpen}>
            <Search className="size-4" aria-hidden="true" />
            <span>Search</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  results,
  loading = false,
  placeholder = "Search…",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  results: SearchResult[]
  loading?: boolean
  placeholder?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  // Preserve the order groups first appear in, so headings stay stable.
  const groups = useMemo(() => {
    const map = new Map<string, SearchResult[]>()
    const term = query.trim().toLowerCase()
    for (const result of results) {
      if (term) {
        const searchable = [result.group, result.label, result.sublabel, result.keywords]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!searchable.includes(term)) continue
      }
      const bucket = map.get(result.group)
      // Keep the command list small even when a workspace has thousands of
      // records. Matching is performed here, so cmdk does not need to mount
      // and filter the entire dataset on every keystroke.
      if (bucket) {
        if (bucket.length < 8) bucket.push(result)
      }
      else map.set(result.group, [result])
    }
    return [...map.entries()]
  }, [query, results])

  function select(result: SearchResult) {
    onOpenChange(false)
    router.push(result.href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg [&>button]:hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-3"
        >
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList className="max-h-[60vh]">
            {loading ? (
              <div className="space-y-3 p-3" role="status" aria-label="Loading search results">
                <Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty>No matches found.</CommandEmpty>
                {groups.map(([heading, items]) => (
                  <CommandGroup key={heading} heading={heading}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.id} ${item.group} ${item.label} ${item.sublabel ?? ""} ${item.keywords ?? ""}`}
                        onSelect={() => select(item)}
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{item.label}</span>
                          {item.sublabel && (
                            <span className="truncate text-xs text-muted-foreground">{item.sublabel}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
