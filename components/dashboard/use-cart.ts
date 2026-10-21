"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import { cartServices } from "@/lib/cart"

/** The cart is a list of service ids kept in this browser, shared by the header and checkout. */

const KEY = "visualcns.cart"
const listeners = new Set<() => void>()
let cached: { raw: string | null; ids: string[] } = { raw: null, ids: [] }

function read(): string[] {
  let raw: string | null = null
  try { raw = window.localStorage.getItem(KEY) } catch { /* Storage blocked; the cart is empty. */ }
  if (raw === cached.raw) return cached.ids
  let ids: string[] = []
  try { ids = cartServices(JSON.parse(raw ?? "[]")).map((service) => service.id) } catch { /* Bad data; start empty. */ }
  cached = { raw, ids }
  return ids
}

function write(ids: string[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(ids)) } catch { /* Storage blocked; keep it in memory only. */ }
  cached = { raw: JSON.stringify(ids), ids }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) listener() }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

const EMPTY: string[] = []

export function useCart() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY)
  const items = useMemo(() => cartServices(ids), [ids])
  const add = useCallback((id: string) => { const current = read(); if (!current.includes(id)) write([...current, id]) }, [])
  const remove = useCallback((id: string) => write(read().filter((item) => item !== id)), [])
  const clear = useCallback(() => write([]), [])
  const replace = useCallback((next: string[]) => write(cartServices(next).map((service) => service.id)), [])
  return { ids, items, add, remove, clear, replace, has: (id: string) => ids.includes(id) }
}
