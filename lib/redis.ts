import { Redis } from '@upstash/redis'
import type { FullDeal, DealSummary } from './types'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function slugify(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/-$/, '')
}

const KEY_DEAL = (id: string) => `str:deal:${id}`
const KEY_INDEX = 'str:deals:index'

export async function saveDeal(deal: FullDeal): Promise<void> {
  await redis.set(KEY_DEAL(deal.id), deal)
  // Add to index only if not already present
  const existing = await redis.lrange<string>(KEY_INDEX, 0, -1)
  if (!existing.includes(deal.id)) {
    await redis.lpush(KEY_INDEX, deal.id)
  }
}

export async function getDeal(slug: string): Promise<FullDeal | null> {
  return await redis.get<FullDeal>(KEY_DEAL(slug))
}

export async function getAllDeals(): Promise<DealSummary[]> {
  const slugs = await redis.lrange<string>(KEY_INDEX, 0, -1)
  if (!slugs.length) return []

  const deals = await Promise.all(slugs.map((slug) => redis.get<FullDeal>(KEY_DEAL(slug))))

  return deals
    .filter((d): d is FullDeal => d !== null)
    .map((d) => ({
      id: d.id,
      address: d.address,
      createdAt: d.createdAt,
      purchasePrice: d.inputs.purchasePrice,
      monthlyCashFlow: d.analysis.monthlyCashFlow,
      cashOnCashReturn: d.analysis.cashOnCashReturn,
      capRate: d.analysis.capRate,
      verdict: d.analysis.verdict,
      propertyImage: d.fetched.propertyImage,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function deleteDeal(slug: string): Promise<void> {
  await redis.del(KEY_DEAL(slug))
  const slugs = await redis.lrange<string>(KEY_INDEX, 0, -1)
  const filtered = slugs.filter((s: string) => s !== slug)
  await redis.del(KEY_INDEX)
  if (filtered.length > 0) {
    await redis.rpush(KEY_INDEX, ...filtered)
  }
}
