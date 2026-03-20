import { NextResponse } from 'next/server'
import { estimateSTRMarket, generateDealSummary } from '@/lib/gemini'
import { fetchZillowData } from '@/lib/apis/zillow'
import { runUnderwriting } from '@/lib/underwriting'
import { saveDeal, slugify } from '@/lib/redis'
import type { DealInputs, FetchedData, FullDeal, RabbuData } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { address, overrides = {} } = body as { address: string; overrides?: Partial<DealInputs> }

    if (!address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    // 1. Gemini market estimate + Zillow property data in parallel
    const [market, zillow] = await Promise.all([
      estimateSTRMarket(address.trim()),
      fetchZillowData(address.trim()),
    ])

    const rabbu: RabbuData = {
      adr: market.adr,
      occupancyRate: market.occupancyRate,
      revPAR: market.revPAR,
      marketADR: market.marketADR,
      marketOccupancy: market.marketOccupancy,
      marketRevPAR: market.marketRevPAR,
      isMockData: !process.env.GEMINI_API_KEY,
      source: process.env.GEMINI_API_KEY ? 'gemini' : 'mock',
    }

    const fetched: FetchedData = {
      geocoded: {
        formattedAddress: address.trim(),
        lat: 0,
        lng: 0,
        zipCode: '',
        city: market.city,
        state: market.state,
        placeId: null,
        source: 'failed',
      },
      zillow,
      rentcast: null,
      rabbu,
      fred: null,
      location: null,
      propertyImage: { url: null, source: 'placeholder', isFallback: true },
    }

    // 2. Build inputs — Zillow wins for property-specific data, Gemini fills gaps
    const purchasePrice = zillow?.listPrice ?? zillow?.zestimate ?? market.estimatedPurchasePrice
    const interestRate = market.mortgageRate
    const propertyTaxAnnual = zillow?.propertyTaxAnnual ?? purchasePrice * market.propertyTaxRate

    const baseInputs: DealInputs = {
      purchasePrice,
      downPaymentPct: 0.25,
      loanTermYears: 30,
      interestRate,
      rehabCost: 0,
      furnishingCost: 8000,
      expectedNightlyRate: rabbu.adr,
      occupancyRate: rabbu.occupancyRate,
      managementFeePct: 0.25,
      cleaningFeePerStay: 75,
      cleaningCostPerStay: 45,
      avgStayLengthNights: 3,
      propertyTaxAnnual,
      insuranceAnnual: 2000,
      platformFeePct: 0.03,
      maintenancePct: 0.08,
      utilitiesMonthly: 250,
      selfManaging: false,
      ...overrides,
    }

    // 3. Run underwriting
    const analysis = runUnderwriting(baseInputs)

    // 4. Build deal object
    const id = slugify(address.trim())
    const deal: FullDeal = {
      id,
      address: address.trim(),
      createdAt: new Date().toISOString(),
      inputs: baseInputs,
      fetched,
      analysis,
      aiSummary: null,
      isMockData: rabbu.isMockData,
    }

    // 5. Gemini deal summary (non-blocking)
    try {
      deal.aiSummary = await generateDealSummary(deal)
    } catch {
      deal.aiSummary = null
    }

    // 6. Save to Redis (non-blocking)
    let redisSaved = true
    try {
      await saveDeal(deal)
    } catch {
      redisSaved = false
    }

    return NextResponse.json({ ...deal, redisSaved })
  } catch (err) {
    console.error('[analyze] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
