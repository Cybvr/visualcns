"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/components/auth-provider"

/** The apply form signs people up or in, so it needs the app's sign-in state. */
export default function SharedJobApplyLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
