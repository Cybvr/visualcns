import { permanentRedirect } from "next/navigation"

export default function LegacyAgentPage() {
  permanentRedirect("/admin")
}
