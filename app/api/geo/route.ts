import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

/** The visitor's country from their IP, as the host sees it (Vercel or Cloudflare). Empty when running locally; the browser looks it up then. */
export function GET(request: NextRequest) {
  const country = (request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "").toUpperCase()
  return NextResponse.json({ country: /^[A-Z]{2}$/.test(country) ? country : "" }, { headers: { "Cache-Control": "no-store" } })
}
