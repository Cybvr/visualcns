"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { SocialIcon } from "@/components/company/social-icon"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { platformLabel } from "@/lib/social"
import { useSocialRequest } from "@/lib/social-client"

/** Connects social accounts without leaving the page: sign in on the platform, then come straight back. */
export function SocialConnectDialog({ companyId, platforms, open, onOpenChange, title, text }: { companyId: string; platforms: string[]; open: boolean; onOpenChange: (open: boolean) => void; title: string; text: string }) {
  const request = useSocialRequest()
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connecting, setConnecting] = useState("")

  // Back from the platform's sign-in: say how it went, then tidy the address.
  const result = searchParams.get("social")
  useEffect(() => {
    if (!result) return
    if (result === "connected") toast.success("Account connected.")
    else if (result === "cancelled") toast.error("Connecting was cancelled.")
    else toast.error("Couldn't connect that account.")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("social")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  async function connect(platform: string) {
    setConnecting(platform)
    try {
      const { url } = await request<{ url: string }>("connect", { method: "POST", body: { companyId, platform, returnTo: pathname } })
      window.location.assign(url)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't start connecting.")
      setConnecting("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {platforms.map((platform) => (
            <Button key={platform} type="button" variant="outline" className="w-full justify-start gap-3" disabled={Boolean(connecting)} onClick={() => void connect(platform)}>
              {connecting === platform ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SocialIcon platform={platform} />}
              Continue with {platformLabel(platform)}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
