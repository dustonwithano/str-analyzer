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

export async function saveDeal(deal: FullDeal): Promise<void> {
  await redis.set(`deal:${deal.id}`, deal)
  // Add to index only if not already present
  const existing = await redis.lrange<string>('deals:index', 0, -1)
  if (!existing.includes(deal.id)) {
    await redis.lpush('deals:index', deal.id)
  }
}

export async function getDeal(slug: string): Promise<FullDeal | null> {
  return await redis.get<FullDeal>(`deal:${slug}`)
}

export async function getAllDeals(): Promise<DealSummary[]> {
  const slugs = await redis.lrange<string>('deals:index', 0, -1)
  if (!slugs.length) return []

  const deals = await Promise.all(slugs.map((slug) => redis.get<FullDeal>(`deal:${slug}`)))

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
  await redis.del(`deal:${slug}`)
  const slugs = await redis.lrange<string>('deals:index', 0, -1)
  const filtered = slugs.filter((s: string) => s !== slug)
  await redis.del('deals:index')
  if (filtered.length > 0) {
    await redis.rpush('deals:index', ...filtered)
  }
}
