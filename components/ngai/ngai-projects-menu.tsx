"use client"

import { ChevronDown } from "lucide-react"
import { NGAI_PROJECTS_URL, ngaiChatUrl } from "@/lib/ngai"
import { useNgaiChats } from "./use-ngai-chats"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NgaiProjectsMenu({ className }: { className?: string }) {
  const { user, authReady, chats, failed } = useNgaiChats()

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
