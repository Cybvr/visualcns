/** A custom domain a company connects to one of its websites. Stored in the `domains` collection, keyed by the domain name. */
export type ConnectedDomain = {
  name: string
  companyId: string
  /** The published website it shows, by its sites.visualcns.com slug. */
  siteSlug: string | null
  status: "pending" | "connected"
  createdAt?: number
  checkedAt?: number
}

/** Where every custom domain points. */
export const DOMAIN_A_RECORD = "76.76.21.21"
export const DOMAIN_CNAME_RECORD = "cname.vercel-dns.com"

/** Endings that take two labels, so "shop.com.ng" is a root domain, not a subdomain. */
const TWO_PART_ENDINGS = new Set(["co.uk", "org.uk", "ac.uk", "com.ng", "org.ng", "net.ng", "edu.ng", "gov.ng", "com.au", "net.au", "org.au", "co.za", "com.gh", "co.ke", "com.br", "co.in", "co.nz", "com.sg"])

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "")
}

export function isValidDomain(value: string) {
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)
}

/** True for a root domain like "acme.com", false for "shop.acme.com". */
export function isRootDomain(name: string) {
  const labels = name.split(".")
  const ending = labels.slice(-2).join(".")
  return labels.length <= (TWO_PART_ENDINGS.has(ending) ? 3 : 2)
}

/** The DNS records to add at the domain provider. */
export function dnsRecordsFor(name: string) {
  if (isRootDomain(name)) {
    return [
      { type: "A", host: "@", value: DOMAIN_A_RECORD },
      { type: "CNAME", host: "www", value: DOMAIN_CNAME_RECORD },
    ]
  }
  const labels = name.split(".")
  const rootLength = TWO_PART_ENDINGS.has(labels.slice(-2).join(".")) ? 3 : 2
  return [{ type: "CNAME", host: labels.slice(0, -rootLength).join("."), value: DOMAIN_CNAME_RECORD }]
}
