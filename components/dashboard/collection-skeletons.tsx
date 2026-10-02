import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function GridCardsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Loading cards">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-3">
          <div className="flex min-h-9 items-center gap-2.5 pl-1">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-xl bg-background/70" />
        </div>
      ))}
    </div>
  )
}

export function TableRowsSkeleton({ headers, rows = 6 }: { headers: string[]; rows?: number }) {
  return (
    <div role="status" aria-label="Loading table" aria-busy="true" className="min-w-0 overflow-x-auto">
      <Table className="w-full table-fixed">
        <TableHeader><TableRow>{headers.map((header, index) => <TableHead key={index}>{header || <span className="sr-only">Actions</span>}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            <TableRow key={row}>
              {headers.map((_, column) => <TableCell key={column} className="py-3"><Skeleton className={column === 0 ? "h-4 w-4/5" : "h-3 w-2/3"} /></TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function MobileCardsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading cards" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-[68px] items-center gap-3 rounded-sm bg-card p-3">
          <Skeleton className="size-11 shrink-0 rounded-xs" />
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}
