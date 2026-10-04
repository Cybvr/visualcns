// Pure slug helpers, safe to use on the server and in the browser.

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Top-level routes that already exist at the site root. A company slug
 * matching one of these would sit behind the real page forever, so it's
 * never handed out.
 */
export const RESERVED_SLUGS = new Set([
  "about",
  "blog",
  "brands",
  "capabilities",
  "case-studies",
  "contact",
  "faq",
  "industries",
  "login",
  "portfolio",
  "pricing",
  "privacy",
  "ratecard",
  "signup",
  "templates",
  "terms",
  "visualhq",
  "share",
  "quotes",
  "estimates",
  "auth",
  "api",
  "dashboard",
  "portal",
  "offline",
  "manifest",
])
