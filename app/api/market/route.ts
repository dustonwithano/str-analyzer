import { NextResponse } from 'next/server'
import { estimateSTRMarket } from '@/lib/gemini'
import type { PropertyContext } from '@/lib/gemini'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })

  const property: PropertyContext = {
    purchasePrice: searchParams.get('purchasePrice') ? Number(searchParams.get('purchasePrice')) : undefined,
    beds: searchParams.get('beds') ? Number(searchParams.get('beds')) : undefined,
    baths: searchParams.get('baths') ? Number(searchParams.get('baths')) : undefined,
    sqft: searchParams.get('sqft') ? Number(searchParams.get('sqft')) : undefined,
  }

  const estimate = await estimateSTRMarket(address, property)
  return NextResponse.json(estimate)
}
