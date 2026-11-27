import { redirect } from "next/navigation"

/** New chats start on the home page now. */
export default function ChatPage() {
  redirect("/admin")
}
