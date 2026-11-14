"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { ChevronDown } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { NGAI_PROJECTS_URL, ngaiChatUrl } from "@/lib/ngai"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Chat = { id: string; title: string; updatedAt: number }

function toMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Date.parse(value) || 0
  if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis()
  }
  return 0
}

export function NgaiProjectsMenu({ className }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [chats, setChats] = useState<Chat[] | null>(null)
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
    // Equality filter only, sorted here, so no composite index is needed.
    getDocs(query(collection(db, "jujuChats"), where("userId", "==", user.uid), limit(50)))
      .then((snapshot) => {
        if (cancelled) return
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, data: doc.data() }))
          .filter(({ data }) => data.isTemplate !== true)
          .map(({ id, data }) => ({
            id,
            title: typeof data.title === "string" && data.title.trim() ? data.title : "Untitled project",
            updatedAt: toMillis(data.updatedAt),
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 8)
        setChats(list)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={className}>
          My Projects
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {!authReady ? (
          <DropdownMenuLabel className="font-normal text-muted-foreground">Loading…</DropdownMenuLabel>
        ) : !user ? (
          <DropdownMenuItem asChild>
            <a href="/login?next=/ngai">Sign in to see your projects</a>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel>Recent projects</DropdownMenuLabel>
            {failed ? (
              <DropdownMenuLabel className="font-normal text-muted-foreground">Couldn&apos;t load projects</DropdownMenuLabel>
            ) : chats === null ? (
              <DropdownMenuLabel className="font-normal text-muted-foreground">Loading…</DropdownMenuLabel>
            ) : chats.length === 0 ? (
              <DropdownMenuLabel className="font-normal text-muted-foreground">No projects yet</DropdownMenuLabel>
            ) : (
              chats.map((chat) => (
                <DropdownMenuItem key={chat.id} asChild>
                  <a href={ngaiChatUrl(chat.id)} className="truncate">
                    {chat.title}
                  </a>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={NGAI_PROJECTS_URL}>View all</a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
