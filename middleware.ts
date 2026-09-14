import { NextResponse, type NextRequest } from "next/server"

/** Preserve the tenant host for server routes and future public host routing. */
export function middleware(request: NextRequest) {
  const forwarded = new Headers(request.headers)
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase()
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "visualcns.com").toLowerCase()
  const subdomain = host.endsWith(`.${root}`) ? host.slice(0, -(root.length + 1)) : ""
  if (subdomain && subdomain !== "www") forwarded.set("x-tenant-subdomain", subdomain)
  return NextResponse.next({ request: { headers: forwarded } })
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }
