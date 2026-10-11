import { cert, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { TRANSACTIONAL_TEMPLATES } from "../lib/transactional-templates.ts"

const agencyId = process.argv[2]
if (!agencyId) throw new Error("Usage: node --experimental-strip-types --env-file=.env.local scripts/seed-transactional-templates.mjs <agencyId>")
initializeApp({ credential: cert({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}) })
const db = getFirestore()
if (!(await db.collection("agencies").doc(agencyId).get()).exists) throw new Error("Agency does not exist")
for (const template of TRANSACTIONAL_TEMPLATES) {
  const ref = db.collection("emailTemplates").doc(`${agencyId}__${template.id}`)
  const created = await db.runTransaction(async (transaction) => {
    if ((await transaction.get(ref)).exists) return false
    transaction.create(ref, { ...template, variables: [...template.variables], agencyId, companyId: agencyId, createdBy: "transactional-template-seed", updatedAt: new Date().toISOString() })
    return true
  })
  console.log(`${created ? "Seeded" : "Preserved"}: ${ref.id}`)
}
