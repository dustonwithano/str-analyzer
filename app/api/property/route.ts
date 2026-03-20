import { NextResponse } from 'next/server'
import { fetchZillowData } from '@/lib/apis/zillow'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })

  const data = await fetchZillowData(address)
  return NextResponse.json(data)
}
