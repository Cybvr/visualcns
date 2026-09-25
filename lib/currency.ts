const FRANKFURTER_API = "https://api.frankfurter.dev/v2"

export async function getExchangeRate(from: string, to: string): Promise<number> {
  const source = from.trim().toUpperCase()
  const target = to.trim().toUpperCase()
  if (!source || !target || source === target) return 1

  const response = await fetch(`${FRANKFURTER_API}/rate/${encodeURIComponent(source.toLowerCase())}/${encodeURIComponent(target.toLowerCase())}`, {
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Could not load the ${source}/${target} exchange rate.`)

  const data = await response.json() as { rate?: number }
  if (!Number.isFinite(data.rate) || (data.rate ?? 0) <= 0) throw new Error(`The ${source}/${target} exchange rate was invalid.`)
  return data.rate as number
}
