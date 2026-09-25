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
import { clearTenantCache, LEGACY_TENANT_ID } from "@/lib/tenancy"

/** sessionStorage key holding the uid an admin is currently "viewing as". */
const VIEW_AS_KEY = "viewAsUid"
/** localStorage key prefix: legacy tenant migration confirmed done for a uid. */
const MIGRATION_DONE_KEY = "legacyTenantMigrationDone"
/** Storage key prefix: admin business organization confirmed to exist for a uid. */
const ADMIN_ORG_READY_KEY = "adminOrganizationReady"

// Storage can be unavailable (private mode, blocked site data); treat that as
// "not remembered" so the original, slower path still runs.
function readStorage(storage: Storage, key: string): boolean {
  try { return storage.getItem(key) === "1" } catch { return false }
}

function writeStorage(storage: Storage, key: string) {
  try { storage.setItem(key, "1") } catch { /* ignore */ }
}

/** Backfill the pre-tenant database before tenant-filtered dashboard queries run. */
async function migrateLegacyTenant(firebaseUser: User, appUser: AppUser | null) {
  if (!appUser || (appUser.role !== "admin" && appUser.role !== "superadmin") || appUser.tenantId !== LEGACY_TENANT_ID) return
  // The server marks the migration complete once it succeeds, after which the
  // call is a no-op. Remember that on this device so later page loads skip it.
  const doneKey = `${MIGRATION_DONE_KEY}:${firebaseUser.uid}`
  if (readStorage(localStorage, doneKey)) return
  try {
    const idToken = await firebaseUser.getIdToken()
    const response = await fetch("/api/admin/tenant-migration", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (response.ok) writeStorage(localStorage, doneKey)
    else console.warn("Legacy tenant migration was not completed", await response.text())
  } catch (error) {
    // Keep sign-in usable if the one-time backfill is temporarily unavailable.
    console.warn("Legacy tenant migration could not run", error)
  }
}

/**
 * Make sure the admin owns a business organization. The first time on a
 * device we wait for it, since a brand-new admin has none yet. After that it
 * already exists, so it only runs as a background refresh, once per session.
 */
async function provisionAdminOrganization(uid: string, appUser: AppUser) {
  const readyKey = `${ADMIN_ORG_READY_KEY}:${uid}`
  const ready = readStorage(localStorage, readyKey)
  if (ready && readStorage(sessionStorage, readyKey)) return
  const run = ensureAdminBusinessOrganization({
    id: appUser.companyId || appUser.uid,
    name: appUser.company || appUser.displayName || undefined,
    email: appUser.email || undefined,
    logoUrl: appUser.photoURL || undefined,
  }).then(() => {
    writeStorage(localStorage, readyKey)
    writeStorage(sessionStorage, readyKey)
  }).catch((organizationError) => {
    console.error("Error provisioning admin organization:", organizationError)
  })
  if (!ready) await run
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
  /** True when an admin is viewing the app as another user. */
  isViewingAs: boolean
  /** True when an admin is viewing the client portal as another user. */
  isImpersonating: boolean
  tenantStatus: TenantStatus | null
  /** The user being viewed, when an admin is using "View as". */
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
          const isAdminDoc = doc?.role === "admin" || doc?.role === "superadmin"
          await migrateLegacyTenant(u, doc)
          if (isAdminDoc && doc) await provisionAdminOrganization(u.uid, doc)

          // Tenant status and a restored "view as" target don't depend on
          // each other, so load them side by side.
          const viewAsUid = typeof window !== "undefined" ? sessionStorage.getItem(VIEW_AS_KEY) : null
          const [tenantStatusValue, viewAsTarget] = await Promise.all([
            (doc?.tenantId ? getTenant(doc.tenantId) : Promise.resolve(null))
              .then((tenant) => tenant?.status || "trial" as TenantStatus)
              .catch(() => "trial" as TenantStatus),
            // Only admins can impersonate, and never themselves.
            isAdminDoc && viewAsUid && viewAsUid !== u.uid
              ? getUser(viewAsUid).then((target) => ({ target }), () => ({ target: null }))
              : Promise.resolve(null),
          ])
          setRealAppUser(doc)
          setTenantStatus(tenantStatusValue)
          void sendWelcomeEmailIfPending(u, doc)

          if (viewAsTarget) {
            const target = viewAsTarget.target
            const sameTenant = doc?.role === "superadmin" || target?.tenantId === doc?.tenantId
            const canViewTarget = sameTenant && (
              (target?.role === "client" && Boolean(target.companyId)) ||
              ((target?.role === "admin" || target?.role === "superadmin") && Boolean(target.tenantId))
            )
            if (canViewTarget) setImpersonated(target)
            else {
              sessionStorage.removeItem(VIEW_AS_KEY)
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
    const authenticatedUser = (await signInWithPopup(auth, googleProvider)).user
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
    clearTenantCache()
    await firebaseSignOut(auth)
  }

  const role = realAppUser?.role ?? null
  const isAdmin = role === "admin" || role === "superadmin"
  const isViewingAs = isAdmin && impersonated !== null
  const isImpersonating = isViewingAs && impersonated?.role === "client"

  function viewAsUser(target: AppUser) {
    const canViewClient = target.role === "client" && Boolean(target.companyId)
    const canViewAdmin = (target.role === "admin" || target.role === "superadmin") && Boolean(target.tenantId)
    if (!isAdmin || (!canViewClient && !canViewAdmin) || (role !== "superadmin" && target.tenantId !== realAppUser?.tenantId)) return
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
        appUser: isViewingAs ? impersonated : realAppUser,
        role,
        loading,
        isAdmin,
        isViewingAs,
        isImpersonating,
        tenantStatus,
        impersonatedUser: isViewingAs ? impersonated : null,
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
