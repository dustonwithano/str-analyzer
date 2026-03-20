import { NextResponse } from 'next/server'
import { fetchMortgageRate } from '@/lib/apis/fred'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchMortgageRate()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
