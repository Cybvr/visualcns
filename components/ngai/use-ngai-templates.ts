"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

/** A Ngai builder template: a `jujuChats` doc with isTemplate: true. `code` draws its thumbnail. */
export type NgaiTemplate = { id: string; title: string; description: string; code: string; price: number }

/** A template's price in dollars: the doc's `price` when set, else $5 or $10 picked from its id so it stays the same. */
function templatePrice(id: string, value: unknown): number {
  if (typeof value === "number" && value > 0) return value
  let sum = 0
  for (const char of id) sum += char.charCodeAt(0)
  return sum % 2 === 0 ? 5 : 10
}

let request: Promise<NgaiTemplate[]> | null = null

function loadTemplates(): Promise<NgaiTemplate[]> {
  // Templates rarely change, so one request per page load is enough.
  if (request) return request
  const pending: Promise<NgaiTemplate[]> = getDocs(query(collection(db, "jujuChats"), where("isTemplate", "==", true)))
    .then((snapshot) =>
      snapshot.docs
        .map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: typeof data.title === "string" ? data.title : "Template",
            description: typeof data.description === "string" ? data.description : "",
            code: typeof data.code === "string" ? data.code : "",
            price: templatePrice(doc.id, data.price),
          }
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    )
    .catch((error) => {
      request = null
      throw error
    })
  request = pending
  return pending
}

/** The builder's templates, sorted by name. `templates` is null while loading, [] on failure. */
export function useNgaiTemplates() {
  const [templates, setTemplates] = useState<NgaiTemplate[] | null>(null)
  useEffect(() => {
    let active = true
    loadTemplates()
      .then((list) => { if (active) setTemplates(list) })
      .catch((error) => {
        console.error("Could not load builder templates:", error)
        if (active) setTemplates([])
      })
    return () => { active = false }
  }, [])
  return templates
}
