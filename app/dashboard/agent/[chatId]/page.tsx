import { permanentRedirect } from "next/navigation"

export default async function LegacyAgentConversationPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params
  permanentRedirect(`/dashboard/chat/${encodeURIComponent(chatId)}`)
}
