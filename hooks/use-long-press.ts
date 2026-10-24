import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react"

const HOLD_MS = 500
const MOVE_TOLERANCE = 10

/**
 * Press and hold to start selecting. Spread the result on a wrapper: a hold
 * calls `onLongPress(key)`, and the tap that ends the hold is swallowed so it
 * doesn't also open the item. Moving (scrolling) cancels the hold.
 */
export function useLongPress(onLongPress: ((key: string) => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    start.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  return useCallback((key: string) => {
    if (!onLongPress) return {}
    return {
      onPointerDown: (event: PointerEvent) => {
        if (event.button !== 0) return
        // Presses on the item's own menu button keep working as normal.
        if ((event.target as HTMLElement).closest("[aria-haspopup]")) return
        fired.current = false
        start.current = { x: event.clientX, y: event.clientY }
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          fired.current = true
          timer.current = null
          navigator.vibrate?.(10)
          onLongPress(key)
        }, HOLD_MS)
      },
      onPointerMove: (event: PointerEvent) => {
        if (!start.current) return
        if (Math.abs(event.clientX - start.current.x) > MOVE_TOLERANCE || Math.abs(event.clientY - start.current.y) > MOVE_TOLERANCE) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onClickCapture: (event: MouseEvent) => {
        if (!fired.current) return
        fired.current = false
        event.preventDefault()
        event.stopPropagation()
      },
      // Stop the phone's own long-press menu (save image, open link).
      onContextMenu: (event: MouseEvent) => {
        if (fired.current || timer.current) event.preventDefault()
      },
    }
  }, [cancel, onLongPress])
}
