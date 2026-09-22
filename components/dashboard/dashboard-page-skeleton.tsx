import { Skeleton } from "@/components/ui/skeleton"

type DashboardPageSkeletonProps = {
  rows?: number
  variant?: "list" | "home" | "detail" | "form"
}

export function DashboardPageSkeleton({ rows = 5, variant = "list" }: DashboardPageSkeletonProps) {
  if (variant === "home") {
    return (
      <div className="space-y-5" role="status" aria-label="Loading dashboard">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="rounded-sm bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xs" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="mt-5 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === "detail") {
    return (
      <div className="space-y-5" role="status" aria-label="Loading page">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3 rounded-sm bg-card p-5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-6 h-32 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
    )
  }

  if (variant === "form") {
    return (
      <div className="space-y-5" role="status" aria-label="Loading page">
        <Skeleton className="h-7 w-48" />
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-sm bg-card p-3">
          <Skeleton className="size-11 rounded-xs" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      ))}
    </div>
  )
}
