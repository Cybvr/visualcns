"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Building2, Check, LayoutDashboard, Moon, Sun } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { AccountHeader, AccountNav } from "@/components/account/account-nav"
import { updateUser } from "@/lib/users"
import { cn } from "@/lib/utils"

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
]

const LANDING_PAGES = [
  { value: "company", label: "Company page", icon: Building2 },
  { value: "admin", label: "Admin", icon: LayoutDashboard },
] as const

export default function CustomizationPage() {
  const { user, appUser, role, isViewingAs } = useAuth()
  const [landingPage, setLandingPage] = useState<"company" | "admin">("company")
  const [savingLanding, setSavingLanding] = useState(false)

  useEffect(() => {
    if (!isViewingAs) setLandingPage(appUser?.landingPage === "admin" ? "admin" : "company")
  }, [appUser?.landingPage, isViewingAs])

  async function chooseLandingPage(value: "company" | "admin") {
    if (!user || value === landingPage) return
    const previous = landingPage
    setLandingPage(value)
    setSavingLanding(true)
    try {
      await updateUser(user.uid, { landingPage: value })
    } catch (error) {
      console.error("Could not save start page:", error)
      setLandingPage(previous)
    } finally {
      setSavingLanding(false)
    }
  }
  const { theme, setTheme } = useTheme()
  // The theme is only known in the browser, so nothing is marked selected until
  // after mount to keep the server and client markup the same.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />

      <AccountHeader title="App settings" />

      <section className="mt-6">
        <h2 className="text-sm font-medium">Appearance</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {THEMES.map((option) => {
            const selected = mounted && theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-3 rounded-[14px] border bg-card px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  selected ? "border-foreground" : "border-border",
                )}
              >
                <option.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium">{option.label}</span>
                {selected && <Check className="size-4" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </section>

      {role === "superadmin" && !isViewingAs && (
        <section className="mt-9">
          <h2 className="text-sm font-medium">Start page</h2>
          <p className="mt-1 text-sm text-muted-foreground">Where you land when you sign in or open the app.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {LANDING_PAGES.map((option) => {
              const selected = landingPage === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={savingLanding}
                  onClick={() => chooseLandingPage(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] border bg-card px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
                    selected ? "border-foreground" : "border-border",
                  )}
                >
                  <option.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-sm font-medium">{option.label}</span>
                  {selected && <Check className="size-4" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
