"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

/** A Ngai builder template: a `jujuChats` doc with isTemplate: true. `code` draws its thumbnail. */
export type NgaiTemplate = { id: string; title: string; description: string; code: string }

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
