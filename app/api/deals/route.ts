import { NextResponse } from 'next/server'
import { getAllDeals } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const deals = await getAllDeals()
    return NextResponse.json(deals)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
