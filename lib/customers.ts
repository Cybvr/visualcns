import { addDoc, collection, deleteDoc, doc, onSnapshot, query, Timestamp, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { tsToMillis } from "./tasks"

const COLLECTION_NAME = "customers"

export const CUSTOMER_STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
] as const

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]["value"]

/** A lead or customer of a company (the business using VisualCNS), not of the agency. */
export type Customer = {
  id: string
  agencyId: string
  companyId: string
  createdBy: string
  name: string
  email: string
  phone: string
  status: CustomerStatus
  /** Where they came from, e.g. Instagram, Website or Referral. */
  source: string
  notes: string
  createdAt: number
  updatedAt: number
}

export type CustomerFields = Pick<Customer, "name" | "email" | "phone" | "status" | "source" | "notes">

export const EMPTY_CUSTOMER: CustomerFields = { name: "", email: "", phone: "", status: "lead", source: "", notes: "" }

const text = (value: unknown, max = 2000) => (typeof value === "string" ? value.trim().slice(0, max) : "")

function clean(fields: CustomerFields): CustomerFields {
  return {
    name: text(fields.name, 200),
    email: text(fields.email, 200).toLowerCase(),
    phone: text(fields.phone, 50),
    status: fields.status === "customer" ? "customer" : "lead",
    source: text(fields.source, 100),
    notes: text(fields.notes),
  }
}

function toCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    agencyId: text(data.agencyId),
    companyId: text(data.companyId),
    createdBy: text(data.createdBy),
    ...clean(data as unknown as CustomerFields),
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt) || tsToMillis(data.createdAt),
  }
}

/** Live list of a company's customers, newest first. */
export function watchCustomers(agencyId: string, companyId: string, onChange: (customers: Customer[]) => void, onError: (error: Error) => void) {
  const customersQuery = query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("companyId", "==", companyId))
  return onSnapshot(
    customersQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => toCustomer(item.id, item.data())).sort((a, b) => b.createdAt - a.createdAt)),
    onError,
  )
}

export async function addCustomer(scope: { agencyId: string; companyId: string; uid: string }, fields: CustomerFields) {
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    agencyId: scope.agencyId,
    companyId: scope.companyId,
    createdBy: scope.uid,
    ...clean(fields),
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateCustomer(id: string, fields: CustomerFields) {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...clean(fields), updatedAt: Timestamp.now() })
}

export async function deleteCustomer(id: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
