import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, '').split('=')
  return [key, value.join('=') || true]
}))
const phase = args.phase || 'audit'
const oldId = args['old-id']
const agencyId = args['agency-id']
if (!['audit', 'prepare', 'verify', 'cleanup'].includes(phase)) throw new Error('Invalid --phase')
if (typeof oldId !== 'string' || typeof agencyId !== 'string' || !oldId || !agencyId) {
  throw new Error('Pass --old-id and --agency-id explicitly.')
}

const app = getApps()[0] ?? initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}) })
const db = getFirestore(app)

async function scan() {
  const collections = await db.listCollections()
  const records = []
  const others = []
  for (const collection of collections) {
    if (['tenants', 'tenantUsage', 'tenantSecrets', 'agencies', 'agencyUsage', 'agencySecrets'].includes(collection.id)) continue
    const snapshot = await collection.get()
    for (const item of snapshot.docs) {
      const data = item.data()
      if (data.tenantId && data.tenantId !== oldId) {
        others.push(item.ref.path)
      } else records.push({ ref: item.ref, data })
    }
  }
  if (others.length) throw new Error(`Found ${others.length} records with another tenantId; refusing single-agency cutover.`)
  return records
}

async function batches(records, patch) {
  for (let start = 0; start < records.length; start += 400) {
    const batch = db.batch()
    for (const record of records.slice(start, start + 400)) batch.update(record.ref, patch(record))
    await batch.commit()
  }
}

async function main() {
  const oldAgency = await db.collection('tenants').doc(oldId).get()
  const newAgency = await db.collection('agencies').doc(agencyId).get()
  const records = await scan()
  const missing = records.filter(({ data }) => data.agencyId !== agencyId)
  const conflicts = records.filter(({ data }) => data.agencyId && data.agencyId !== agencyId)
  console.log(JSON.stringify({ phase, oldId, agencyId, oldAgencyExists: oldAgency.exists, newAgencyExists: newAgency.exists, oldFieldRecords: records.filter(({ data }) => Object.hasOwn(data, 'tenantId')).length, scopedRecords: records.length, needingAgencyId: missing.length, conflictingAgencyIds: conflicts.length }))

  if (phase === 'audit') return
  if (phase === 'prepare') {
    if (!oldAgency.exists) throw new Error('Old agency document is missing.')
    if (newAgency.exists && args.resume !== 'true') throw new Error('Target agency document already exists; use --resume=true after inspecting it.')
    if (!newAgency.exists) await db.collection('agencies').doc(agencyId).set(oldAgency.data())
    for (const [oldName, newName] of [['tenantUsage', 'agencyUsage'], ['tenantSecrets', 'agencySecrets']]) {
      const oldDoc = await db.collection(oldName).doc(oldId).get()
      if (oldDoc.exists && !(await db.collection(newName).doc(agencyId).get()).exists) {
        const { tenantId: _oldField, ...data } = oldDoc.data()
        await db.collection(newName).doc(agencyId).set({ ...data, agencyId })
      }
    }
    await batches(records, () => ({ agencyId }))
    console.log(`Prepared ${records.length} records; old fields and documents remain for the running site.`)
    return
  }

  if (!newAgency.exists) throw new Error('Target agency document is missing.')
  if (missing.length) throw new Error(`${missing.length} records still need agencyId.`)
  if (phase === 'verify') {
    console.log('Verified agencyId on all scoped records. No old data was removed.')
    return
  }

  if (args['deployed-agency-code'] !== 'true') throw new Error('Cleanup requires --deployed-agency-code=true after the app and rules are live.')
  await batches(records.filter(({ data }) => Object.hasOwn(data, 'tenantId')), () => ({ tenantId: FieldValue.delete() }))
  for (const oldName of ['tenantUsage', 'tenantSecrets', 'tenants']) {
    const oldDoc = await db.collection(oldName).doc(oldId).get()
    if (oldDoc.exists) await oldDoc.ref.delete()
  }
  console.log('Removed old tenantId fields and old agency documents. Run audit again to confirm.')
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1) })
