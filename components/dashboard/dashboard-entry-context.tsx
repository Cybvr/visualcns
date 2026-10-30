"use client"

import { createContext, useContext } from "react"

export const DashboardEntryReadyContext = createContext<(() => void) | null>(null)

export function useDashboardEntryReady() {
  return useContext(DashboardEntryReadyContext)
}
