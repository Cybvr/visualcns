import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"
import { adminServices } from "@/lib/firebase-admin"

const MASTER_KEY = createHash("sha256").update(process.env.TENANT_SECRETS_KEY || process.env.FIREBASE_PRIVATE_KEY || "visualhq-tenant-secrets").digest()

function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", MASTER_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`
}

function decrypt(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".")
  if (!ivValue || !tagValue || !encryptedValue) return ""
  const decipher = createDecipheriv("aes-256-gcm", MASTER_KEY, Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8")
}

export async function getTenantSecret(tenantId: string, name: string, fallback = "") {
  const { db } = adminServices()
  const snapshot = await db.collection("tenantSecrets").doc(tenantId).get()
  const stored = snapshot.data()?.[name]
  return typeof stored === "string" && stored ? decrypt(stored) : fallback
}

export async function setTenantSecret(tenantId: string, name: string, value: string) {
  const { db } = adminServices()
  await db.collection("tenantSecrets").doc(tenantId).set({ [name]: value ? encrypt(value) : FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

export async function recordTenantUsage(tenantId: string, metric: string, amount = 1) {
  const { db } = adminServices()
  const ref = db.collection("tenantUsage").doc(tenantId)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const current = snapshot.data() || {}
    transaction.set(ref, { tenantId, [metric]: Number(current[metric] || 0) + amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  })
}
