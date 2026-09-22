"use client"

import { Search } from "lucide-react"

import { useDashboardSearch } from "@/components/dashboard/sidebar-search"
import { GlobalSearchDialog } from "@/components/search/global-search"
import { Button } from "@/components/ui/button"

/** Header icon that opens the same workspace-wide search palette as the sidebar. */
export function DashboardSearchButton({ className }: { className?: string }) {
  const { open, setOpen, openSearch, results, loading } = useDashboardSearch()
  return (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label="Search" onClick={openSearch} className={className}>
        <Search className="size-4" aria-hidden="true" />
      </Button>
      <GlobalSearchDialog
        open={open}
        onOpenChange={setOpen}
        results={results}
        loading={loading}
        placeholder="Search companies, projects, documents…"
      />
    </>
  )
}
