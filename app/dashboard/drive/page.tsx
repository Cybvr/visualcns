import { redirect } from "next/navigation"

/** Drive lives inside Documents now, under the Media filter. This keeps old links working. */
export default function DrivePage() {
  redirect("/dashboard/documents?type=media")
}
