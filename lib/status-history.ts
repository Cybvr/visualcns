import { collection, doc, getDocs, query, runTransaction, Timestamp, where, type Transaction } from "firebase/firestore"

import { auth, db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"

export type StatusHistoryEntity = "task" | "lead"

export interface StatusEvent {
  id: string
  agencyId: string
  entityType: StatusHistoryEntity
  entityId: string
  fromStatus: string
  toStatus: string
  changedBy: string
  changedAt: Timestamp | string | number | null
  companyId?: string
  projectId?: string
}

const COLLECTION_NAME = "statusEvents"

function timestampMillis(value: unknown): number {
  if (!value) return 0
  if (value instanceof Timestamp) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === "object") {
    const object = value as { seconds?: number; _seconds?: number; nanoseconds?: number }
    const seconds = object.seconds ?? object._seconds
    if (typeof seconds === "number") return seconds * 1000 + Math.floor((object.nanoseconds ?? 0) / 1e6)
  }
  return 0
}

/** Add a transition to the same transaction that updates the source record. */
export function stageStatusEvent(
  transaction: Transaction,
  data: Omit<StatusEvent, "id" | "changedAt"> & { changedAt?: Timestamp },
) {
  const ref = doc(collection(db, COLLECTION_NAME))
  transaction.set(ref, {
    ...data,
    changedAt: data.changedAt ?? Timestamp.now(),
  })
}

/**
 * Read an entity's status history. Events are sorted in memory so this stays
 * usable without requiring a composite Firestore index.
 */
export async function getStatusHistory(entityType: StatusHistoryEntity, entityId: string): Promise<StatusEvent[]> {
  if (!entityId) return []
  const agencyId = await getCurrentAgencyId()
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION_NAME),
      where("agencyId", "==", agencyId),
      where("entityType", "==", entityType),
      where("entityId", "==", entityId),
    ),
  )
  return snapshot.docs
    .map((item) => ({ ...(item.data() as Omit<StatusEvent, "id">), id: item.id }))
    .sort((a, b) => timestampMillis(b.changedAt) - timestampMillis(a.changedAt))
}

/** Run a status-aware update for callers that need the shared transaction path. */
export async function updateWithStatusEvent<T extends Record<string, unknown>>(params: {
  collectionName: string
  id: string
  entityType: StatusHistoryEntity
  changes: T
  getStatus: (data: Record<string, unknown>) => string
  getNextStatus: (changes: T) => string | undefined
  eventData?: Partial<Pick<StatusEvent, "companyId" | "projectId">>
}) {
  const agencyId = await getCurrentAgencyId()
  const changedBy = auth.currentUser?.uid
  if (!changedBy) throw new Error("Please sign in again.")
  return runTransaction(db, async (transaction) => {
    const sourceRef = doc(db, params.collectionName, params.id)
    const source = await transaction.get(sourceRef)
    if (!source.exists()) throw new Error("Record not found")

    const current = source.data() as Record<string, unknown>
    const fromStatus = params.getStatus(current)
    const toStatus = params.getNextStatus(params.changes)
    const updatedAt = Timestamp.now()
    transaction.update(sourceRef, { ...params.changes, updatedAt })
    if (toStatus && toStatus !== fromStatus) {
      stageStatusEvent(transaction, {
        agencyId,
        entityType: params.entityType,
        entityId: params.id,
        fromStatus,
        toStatus,
        changedBy,
        ...params.eventData,
      })
    }
  })
}
