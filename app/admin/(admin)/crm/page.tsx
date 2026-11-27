import { redirect } from "next/navigation"

/** The CRM opens on Leads; Companies and Contacts are its other tabs. */
export default function CrmPage() {
  redirect("/admin/leads")
}
