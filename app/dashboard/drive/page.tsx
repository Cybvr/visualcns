import { redirect } from "next/navigation"

/** Keep old Drive links working by sending them to the Media page. */
export default function DrivePage() {
  redirect("/dashboard/media")
}
