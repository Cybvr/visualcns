"use client"

import { useEffect, useState } from "react"

import { platformLabel } from "@/lib/social"
import { useSocialRequest } from "@/lib/social-client"

type AccountNumbers = {
  id: string
  platform: string
  available: boolean
  followers?: number | null
  followerChange?: number | null
  reach?: number | null
  views?: number | null
  interactions?: number | null
}

type PostNumbers = { creativeId: string; title: string; publishedAt: string; likes: number; comments: number; shares: number; saves: number }

const number = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

function Stat({ label, value, signed = false }: { label: string; value?: number | null; signed?: boolean }) {
  if (value === null || value === undefined) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{signed && value > 0 ? "+" : ""}{number.format(value)}</p>
    </div>
  )
}

/**
 * Followers, reach and engagement from the company's connected social
 * accounts, plus how its recent posts did. Shows nothing until an account is connected.
 */
export function SocialAnalytics({ companyId }: { companyId: string }) {
  const request = useSocialRequest()
  const [data, setData] = useState<{ accounts: AccountNumbers[]; posts: PostNumbers[] } | null>(null)

  useEffect(() => {
    let active = true
    request<{ accounts: AccountNumbers[]; posts: PostNumbers[] }>(`analytics?companyId=${encodeURIComponent(companyId)}`)
      .then((result) => { if (active) setData(result) })
      .catch(() => { if (active) setData(null) })
    return () => { active = false }
  }, [companyId, request])

  if (!data || (!data.accounts.length && !data.posts.length)) return null

  return (
    <section aria-labelledby="social-analytics-title" className="mb-8">
      <h2 id="social-analytics-title" className="surface-section-label py-2">Social</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.accounts.map((account) => (
          <div key={account.id} className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">{platformLabel(account.platform)}</p>
            {account.available ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat label="Followers" value={account.followers} />
                <Stat label="New followers (30 days)" value={account.followerChange} signed />
                <Stat label="Reach (30 days)" value={account.reach} />
                <Stat label="Views (30 days)" value={account.views} />
                <Stat label="Engagement (30 days)" value={account.interactions} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No numbers yet.</p>
            )}
          </div>
        ))}
      </div>

      {data.posts.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium">Recent posts</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Likes</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Comments</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Shares</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Saves</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.posts.map((post) => (
                <tr key={post.creativeId}>
                  <td className="max-w-0 truncate px-4 py-2">{post.title}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{number.format(post.likes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{number.format(post.comments)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{number.format(post.shares)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{number.format(post.saves)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
