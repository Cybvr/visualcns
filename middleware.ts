import { NextResponse, type NextRequest } from "next/server"

/** Preserve the agency host for server routes and future public host routing. */
export function middleware(request: NextRequest) {
  const forwarded = new Headers(request.headers)
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase()
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "visualcns.com").toLowerCase()
  const subdomain = host.endsWith(`.${root}`) ? host.slice(0, -(root.length + 1)) : ""
  if (subdomain && subdomain !== "www") forwarded.set("x-agency-subdomain", subdomain)
  // Server layouts use these stable request headers to build route-specific
  // Open Graph metadata for crawlers that never execute client-side code.
  forwarded.set("x-visualcns-pathname", request.nextUrl.pathname)
  forwarded.set("x-visualcns-search", request.nextUrl.searchParams.toString())
  return NextResponse.next({ request: { headers: forwarded } })
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }
