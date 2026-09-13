/**
 * Seeds the VisualCNS ad campaign into the shared comms template store
 * (the `emailTemplates` collection the dashboard email module reads).
 *
 * Each ad becomes one template, matching EmailTemplateRecord in
 * lib/email-templates-store.ts:
 *   { id, name, subject, body, imageUrl, imageAlt, companyId, createdBy, updatedAt }
 * and is stored under the doc id `${companyId}__${id}`, exactly like
 * saveEmailTemplate(). Re-running is safe: docs are matched on that id and
 * merged in place, so the copy always reflects this file.
 *
 * Templates are scoped per workspace (companyId) and writes are admin-only
 * under firestore.rules, so this uses the Firebase Admin SDK and resolves the
 * workspace from the owner's `users` doc, looked up by email. The "Book a call"
 * button is mapped by template id in TEMPLATE_CTA (app/dashboard/email/page.tsx).
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-ad-templates.mjs            # apply
 *   node --env-file=.env.local scripts/seed-ad-templates.mjs --dry      # preview
 *   node --env-file=.env.local scripts/seed-ad-templates.mjs --email you@x.com
 *   node --env-file=.env.local scripts/seed-ad-templates.mjs --company <companyId>
 *
 * Credentials (either works):
 *   - FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   - GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account JSON
 */
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const DRY_RUN = process.argv.includes("--dry")
const OWNER_EMAIL = argValue("--email") || "jide.pinheiro@gmail.com"
const COMPANY_OVERRIDE = argValue("--company") || ""

function argValue(flag) {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : ""
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, "..", "public")

/**
 * The four campaign concepts. Each ships in two formats — a film photo (9:16)
 * and a text-only card (1:1) — for eight templates in total. subject is the
 * headline, body is the subheading, and every one shares the "Book a call" CTA.
 */
const CONCEPTS = [
  {
    key: "ai-build",
    subject: "AI can build it. We make it work.",
    body: "Custom tools your business can trust.",
    photoAlt: "A Nigerian coffee shop owner checks a blue dashboard on her laptop.",
  },
  {
    key: "anyone-build",
    subject: "Anyone can build a tool now. Can you trust it?",
    body: "We build the ones that hold up.",
    photoAlt: "A Nigerian apparel studio owner beside a laptop showing a blue dashboard.",
  },
  {
    key: "dashboard-right",
    subject: "Your dashboard looks right. Is it?",
    body: "We build tools that get the numbers right.",
    photoAlt: "A Nigerian print studio owner checking figures on a laptop.",
  },
  {
    key: "ten-tools",
    subject: "You built ten tools. None of them talk.",
    body: "We build one system that works.",
    photoAlt: "A Nigerian shop owner holding a tablet showing one unified blue dashboard.",
  },
]

const FORMATS = [
  { suffix: "photo", label: "photo 9:16" },
  { suffix: "text", label: "text 1:1" },
]

function buildSeeds() {
  const seeds = []
  for (const concept of CONCEPTS) {
    for (const format of FORMATS) {
      const id = `ad-${concept.key}-${format.suffix}`
      seeds.push({
        id,
        name: `Ad — ${concept.subject} (${format.label})`,
        subject: concept.subject,
        body: concept.body,
        imageUrl: `/ads/${id}.png`,
        imageAlt:
          format.suffix === "photo"
            ? concept.photoAlt
            : `VisualCNS ad — “${concept.subject}”`,
      })
    }
  }
  return seeds
}

function initAdmin() {
  if (getApps().length) return getFirestore()
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS / ambient GCP auth.
    initializeApp({ credential: applicationDefault(), projectId })
  }
  return getFirestore()
}

async function resolveWorkspace(db) {
  if (COMPANY_OVERRIDE) return { companyId: COMPANY_OVERRIDE, createdBy: "seed" }
  const snap = await db.collection("users").where("email", "==", OWNER_EMAIL).limit(1).get()
  if (snap.empty) {
    throw new Error(
      `No users doc found for ${OWNER_EMAIL}. Pass --company <companyId> to seed a specific workspace.`,
    )
  }
  const docSnap = snap.docs[0]
  const data = docSnap.data()
  // companyId defaults to the uid when a workspace was never split out (see
  // lib/users.ts upsertUserOnLogin), so mirror that fallback here.
  return { companyId: data.companyId || docSnap.id, createdBy: docSnap.id }
}

async function main() {
  const db = initAdmin()
  const { companyId, createdBy } = await resolveWorkspace(db)
  const seeds = buildSeeds()
  const updatedAt = new Date().toISOString()

  console.log(
    `${DRY_RUN ? "DRY RUN — no writes\n" : ""}Seeding ${seeds.length} ad templates into emailTemplates`,
  )
  console.log(`workspace companyId: ${companyId}\n`)

  let written = 0
  let missingImages = 0
  for (const seed of seeds) {
    const imagePath = join(PUBLIC_DIR, seed.imageUrl.replace(/^\//, ""))
    if (!existsSync(imagePath)) {
      missingImages += 1
      console.warn(`  ! image missing: public${seed.imageUrl}`)
    }
    const record = { ...seed, companyId, createdBy, updatedAt }
    const docId = `${companyId}__${seed.id}`
    if (!DRY_RUN) {
      await db.collection("emailTemplates").doc(docId).set(record, { merge: true })
    }
    written += 1
    console.log(`  ${DRY_RUN ? "would write" : "wrote"} ${docId}`)
  }

  if (missingImages > 0) {
    console.warn(
      `\n${missingImages} image(s) not found under public/ads. The templates still` +
        ` seed, but the images must be placed there (and deployed) to render.`,
    )
  }
  console.log(`\nDone. ${written} template(s) ${DRY_RUN ? "would be" : ""} seeded.`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
