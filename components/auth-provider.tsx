"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"
import { ensureAdminBusinessOrganization } from "@/lib/business-profile"
import { getUser, upsertUserOnLogin, type AppUser, type UserRole } from "@/lib/users"
import { portalPath } from "@/lib/portal-model"
import { getTenant, type TenantStatus } from "@/lib/tenants"
import { LEGACY_TENANT_ID } from "@/lib/tenancy"

/** sessionStorage key holding the uid an admin is currently "viewing as". */
const VIEW_AS_KEY = "viewAsUid"

/** Backfill the pre-tenant database before tenant-filtered dashboard queries run. */
async function migrateLegacyTenant(firebaseUser: User, appUser: AppUser | null) {
  if (!appUser || (appUser.role !== "admin" && appUser.role !== "superadmin") || appUser.tenantId !== LEGACY_TENANT_ID) return
  try {
    const idToken = await firebaseUser.getIdToken()
    const response = await fetch("/api/admin/tenant-migration", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (!response.ok) console.warn("Legacy tenant migration was not completed", await response.text())
  } catch (error) {
    // Keep sign-in usable if the one-time backfill is temporarily unavailable.
    console.warn("Legacy tenant migration could not run", error)
  }
}

async function sendWelcomeEmailIfPending(firebaseUser: User, appUser: AppUser | null) {
  if (!appUser?.welcomeEmailPending || appUser.welcomeEmailSentAt || appUser.role !== "client" || !appUser.email) return
  try {
    const idToken = await firebaseUser.getIdToken()
    await fetch("/api/email/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        welcome: true,
        templateId: "welcome-client-portal",
        to: appUser.email,
        cta: { text: "Open your client portal", url: `${portalPath(appUser.companyId || appUser.uid)}` },
      }),
    })
  } catch (error) {
    // Welcome delivery should never prevent the user from entering the portal.
    console.warn("Welcome email could not be sent", error)
  }
}

type AuthContextValue = {
  user: User | null
  /**
   * The Firestore user doc data consumers should read (tasks/projects are
   * scoped by `appUser.companyId`). When an admin is viewing as a client this is
   * the *target* client's doc; otherwise it's the signed-in user's own doc.
   */
  appUser: AppUser | null
  /** Role from the signed-in user's own doc — unaffected by "view as". */
  role: UserRole | null
  loading: boolean
  isAdmin: boolean
  /** True when an admin is previewing the dashboard as another user. */
  isImpersonating: boolean
  tenantStatus: TenantStatus | null
  /** The user being previewed, when impersonating. */
  impersonatedUser: AppUser | null
  /** Admin-only: start previewing the app as `target`. */
  viewAsUser: (target: AppUser) => void
  /** Stop previewing and return to the admin's own account. */
  stopViewingAs: () => void
  signUpWithEmail: (name: string, email: string, password: string, agencyName?: string, createWorkspace?: boolean) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: (agencyName?: string, createWorkspace?: boolean, workspaceId?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // The signed-in user's own doc. Auth/role checks always use this.
  const [realAppUser, setRealAppUser] = useState<AppUser | null>(null)
  // The doc of the user an admin is "viewing as", if any.
  const [impersonated, setImpersonated] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true)
      setUser(u)
      if (u) {
        try {
          const doc = await upsertUserOnLogin({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
          })
          await migrateLegacyTenant(u, doc)
          if (doc?.role === "admin" || doc?.role === "superadmin") {
            try {
              await ensureAdminBusinessOrganization({
                id: doc.companyId || doc.uid,
                name: doc.company || doc.displayName || undefined,
                email: doc.email || undefined,
                logoUrl: doc.photoURL || undefined,
              })
            } catch (organizationError) {
              console.error("Error provisioning admin organization:", organizationError)
            }
          }
          setRealAppUser(doc)
          try {
            const tenant = doc?.tenantId ? await getTenant(doc.tenantId) : null
            setTenantStatus(tenant?.status || "trial")
          } catch {
            setTenantStatus("trial")
          }
          void sendWelcomeEmailIfPending(u, doc)

          // Restore a "view as" selection made before navigating here. Only
          // admins can impersonate, and never themselves.
          const viewAsUid = typeof window !== "undefined" ? sessionStorage.getItem(VIEW_AS_KEY) : null
          if ((doc?.role === "admin" || doc?.role === "superadmin") && viewAsUid && viewAsUid !== u.uid) {
            try {
              setImpersonated(await getUser(viewAsUid))
            } catch {
              setImpersonated(null)
            }
          } else {
            setImpersonated(null)
          }
        } catch (error) {
          console.error("Error provisioning user:", error)
          setRealAppUser(null)
          setImpersonated(null)
        }
      } else {
        setRealAppUser(null)
        setImpersonated(null)
        setTenantStatus(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle(agencyName = "", createWorkspace = false, workspaceId = "") {
    const authenticatedUser = auth.currentUser || (await signInWithPopup(auth, googleProvider)).user
    if (workspaceId) {
      const idToken = await authenticatedUser.getIdToken()
      const response = await fetch("/api/auth/workspaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })
      const data = await response.json() as { error?: string; status?: string }
      if (!response.ok) throw new Error(data.error || "Could not join organization")
      const doc = await upsertUserOnLogin({
        uid: authenticatedUser.uid,
        email: authenticatedUser.email,
        displayName: authenticatedUser.displayName,
        photoURL: authenticatedUser.photoURL,
      })
      setRealAppUser(doc)
      setTenantStatus((data.status as TenantStatus | undefined) || "trial")
      return
    }
    if (createWorkspace) {
      const doc = await upsertUserOnLogin({
        uid: authenticatedUser.uid,
        email: authenticatedUser.email,
        displayName: authenticatedUser.displayName,
        photoURL: authenticatedUser.photoURL,
        agencyName,
        createWorkspace: true,
      })
      setRealAppUser(doc)
      setTenantStatus("trial")
    }
  }

  async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signUpWithEmail(name: string, email: string, password: string, agencyName = "", createWorkspace = false) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const displayName = name.trim()

    if (displayName) {
      await updateProfile(credential.user, { displayName })
    }

    const doc = await upsertUserOnLogin({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName,
      photoURL: credential.user.photoURL,
      agencyName: createWorkspace ? agencyName : undefined,
      createWorkspace,
    })
    setRealAppUser(doc)
    if (createWorkspace) setTenantStatus("trial")
  }

  async function signOut() {
    sessionStorage.removeItem(VIEW_AS_KEY)
    setImpersonated(null)
    await firebaseSignOut(auth)
  }

  const role = realAppUser?.role ?? null
  const isAdmin = role === "admin" || role === "superadmin"
  const isImpersonating = isAdmin && impersonated !== null

  function viewAsUser(target: AppUser) {
    if (!isAdmin) return
    sessionStorage.setItem(VIEW_AS_KEY, target.uid)
    setImpersonated(target)
  }

  function stopViewingAs() {
    sessionStorage.removeItem(VIEW_AS_KEY)
    setImpersonated(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser: isImpersonating ? impersonated : realAppUser,
        role,
        loading,
        isAdmin,
        isImpersonating,
        tenantStatus,
        impersonatedUser: isImpersonating ? impersonated : null,
        viewAsUser,
        stopViewingAs,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
