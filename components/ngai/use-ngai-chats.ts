"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

/** `slug` is the published subdomain, or null when the chat isn't published. */
export type NgaiChat = { id: string; title: string; updatedAt: number; slug: string | null }

function toMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Date.parse(value) || 0
  if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis()
  }
  return 0
}

// One shared request per user. The top-bar menu and the sidebar group both use this hook,
// and two identical concurrent queries on the same target trip a Firestore watch-stream
// assertion ("INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)").
const CACHE_MS = 30_000
const requests = new Map<string, { at: number; promise: Promise<NgaiChat[]> }>()

function loadChats(uid: string): Promise<NgaiChat[]> {
  const cached = requests.get(uid)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise
  // Equality filter only, sorted here, so no composite index is needed.
  const promise = getDocs(query(collection(db, "jujuChats"), where("userId", "==", uid), limit(50))).then(
    (snapshot) =>
      snapshot.docs
        .map((doc) => ({ id: doc.id, data: doc.data() }))
        .filter(({ data }) => data.isTemplate !== true)
        .map(({ id, data }) => ({
          id,
          title: typeof data.title === "string" && data.title.trim() ? data.title : "Untitled project",
          updatedAt: toMillis(data.updatedAt),
          slug: data.published === true && typeof data.slug === "string" && data.slug ? data.slug : null,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt),
  )
  requests.set(uid, { at: Date.now(), promise })
  promise.catch(() => {
    if (requests.get(uid)?.promise === promise) requests.delete(uid)
  })
  return promise
}

/**
 * The signed-in user's most recent Ngai builder chats (the `jujuChats` collection),
 * newest first, templates left out. `chats` is null while loading or when signed out.
 */
export function useNgaiChats(count = 8) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [chats, setChats] = useState<NgaiChat[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next)
        setAuthReady(true)
      }),
    [],
  )

  useEffect(() => {
    if (!user) {
      setChats(null)
      return
    }
    let cancelled = false
    setFailed(false)
    loadChats(user.uid)
      .then((list) => {
        if (!cancelled) setChats(list.slice(0, count))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [user, count])

  return { user, authReady, chats, failed }
}
