"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { ImageDropzone } from "@/components/image-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { slugifyUser, uniqueUserSlug, updateUser } from "@/lib/users"

const CONTACT_FIELDS = [
  { key: "phone", label: "Phone", type: "tel", placeholder: "+234 800 000 0000" },
  { key: "website", label: "Website", type: "url", placeholder: "https://" },
  { key: "linkedIn", label: "LinkedIn", type: "url", placeholder: "linkedin.com/in/" },
  { key: "instagram", label: "Instagram", type: "text", placeholder: "@handle" },
  { key: "x", label: "X", type: "text", placeholder: "@handle" },
] as const

type ContactKey = (typeof CONTACT_FIELDS)[number]["key"]

/** Label and value on one line, divided by a hairline. */
function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    // Size set on the row: the dashboard-body rule makes label and input inherit theirs.
    <div className="flex items-center gap-3 border-b border-border py-1.5 text-sm">
      <label htmlFor={id} className="w-24 shrink-0 text-muted-foreground">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  )
}

const inlineInput = "h-9 border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"

export default function ProfilePage() {
  const { user, appUser } = useAuth()

  const [displayName, setDisplayName] = useState("")
  const [company, setCompany] = useState("")
  const [photoURL, setPhotoURL] = useState("")
  const [slug, setSlug] = useState("")
  const [contact, setContact] = useState<Record<ContactKey, string>>({ phone: "", website: "", linkedIn: "", instagram: "", x: "" })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    setDisplayName(appUser?.displayName || "")
    setCompany(appUser?.company || "")
    setPhotoURL(appUser?.photoURL || "")
    setSlug(appUser?.slug || "")
    setContact({
      phone: appUser?.phone || "",
      website: appUser?.website || "",
      linkedIn: appUser?.linkedIn || "",
      instagram: appUser?.instagram || "",
      x: appUser?.x || "",
    })
  }, [appUser])

  if (!user) return null

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!appUser?.uid || saving) return

    setSaving(true)
    setNotice(null)
    try {
      // Whatever they typed is cleaned up and checked against other accounts,
      // so the saved slug is always a usable, unclaimed address.
      const wanted = slugifyUser(slug) || displayName || appUser.email
      const finalSlug = await uniqueUserSlug(wanted, appUser.uid)

      await updateUser(appUser.uid, {
        displayName: displayName.trim(),
        company: company.trim(),
        photoURL: photoURL.trim(),
        slug: finalSlug,
        phone: contact.phone.trim(),
        website: contact.website.trim(),
        linkedIn: contact.linkedIn.trim(),
        instagram: contact.instagram.trim(),
        x: contact.x.trim(),
      })
      setSlug(finalSlug)
      setNotice({
        tone: "success",
        text: finalSlug === slugifyUser(slug) ? "Profile saved." : `Profile saved. Your handle is ${finalSlug}.`,
      })
      // The signed-in user is read once at sign-in, so reload to pick the new
      // values up in the sidebar and everywhere else they appear.
      setTimeout(() => window.location.reload(), 600)
    } catch (error) {
      console.error("Error saving profile:", error)
      setNotice({ tone: "error", text: "Couldn't save your profile. Try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />

      <div className="mt-5">
        <ImageDropzone compact value={photoURL} onChange={setPhotoURL} caption={displayName || appUser?.email || user.email} />
      </div>

      <form onSubmit={save} className="mt-6">
        <Row id="display-name" label="Name">
          <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inlineInput} />
        </Row>
        <Row id="company" label="Workspace">
          <Input id="company" value={company} onChange={(event) => setCompany(event.target.value)} className={inlineInput} />
        </Row>
        <Row id="slug" label="Handle">
          <span className="shrink-0 text-sm text-muted-foreground">www.visualcns.com/</span>
          <Input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} className={inlineInput} />
        </Row>
        {CONTACT_FIELDS.map((field) => (
          <Row key={field.key} id={`contact-${field.key}`} label={field.label}>
            <Input
              id={`contact-${field.key}`}
              type={field.type}
              value={contact[field.key]}
              onChange={(event) => setContact((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              className={inlineInput}
            />
          </Row>
        ))}

        <div className="flex items-center gap-3 pt-5">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save changes
          </Button>
          {notice && (
            <span className={notice.tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
              {notice.text}
            </span>
          )}
        </div>
      </form>
    </main>
  )
}
