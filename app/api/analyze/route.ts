import { NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/apis/geocoder'
import { fetchZillowData } from '@/lib/apis/zillow'
import { fetchRentcastData } from '@/lib/apis/rentcast'
import { fetchRabbuData } from '@/lib/apis/rabbu'
import { fetchMortgageRate } from '@/lib/apis/fred'
import { getLocationScore } from '@/lib/apis/maps'
import { getPropertyImage } from '@/lib/apis/propertyImage'
import { runUnderwriting } from '@/lib/underwriting'
import { generateDealSummary } from '@/lib/gemini'
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

    // 1. Geocode
    const geocoded = await geocodeAddress(address.trim())

    // 2. Parallel API fetches — never let one failure block others
    const [zillowResult, rentcastResult, rabbuResult, fredResult, locationResult] =
      await Promise.allSettled([
        fetchZillowData(geocoded.formattedAddress),
        fetchRentcastData(geocoded.formattedAddress, 3),
        fetchRabbuData(geocoded.zipCode, geocoded.city),
        fetchMortgageRate(),
        getLocationScore(geocoded.formattedAddress, geocoded.lat, geocoded.lng),
      ])

    const zillow = zillowResult.status === 'fulfilled' ? zillowResult.value : null
    const rentcast = rentcastResult.status === 'fulfilled' ? rentcastResult.value : null
    const rabbu: RabbuData =
      rabbuResult.status === 'fulfilled'
        ? rabbuResult.value
        : { adr: 185, occupancyRate: 0.62, revPAR: 114.7, marketADR: 185, marketOccupancy: 0.62, marketRevPAR: 114.7, isMockData: true, source: 'mock' }
    const fred = fredResult.status === 'fulfilled' ? fredResult.value : null
    const location = locationResult.status === 'fulfilled' ? locationResult.value : null

    // 3. Property image
    const propertyImage = await getPropertyImage(
      geocoded.formattedAddress,
      zillow?.zpid,
      zillow?.imgSrc,
      geocoded.placeId
    )

    const fetched: FetchedData = { geocoded, zillow, rentcast, rabbu, fred, location, propertyImage }

    // 4. Build inputs from fetched data + defaults
    const purchasePrice = zillow?.listPrice ?? zillow?.zestimate ?? 650000
    const interestRate = fred?.rate ?? 0.0695
    const propertyTaxAnnual = zillow?.propertyTaxAnnual ?? purchasePrice * 0.012

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

    // 5. Run underwriting
    const analysis = runUnderwriting(baseInputs)

    // 6. Build deal object
    const id = slugify(geocoded.formattedAddress)
    const deal: FullDeal = {
      id,
      address: geocoded.formattedAddress,
      createdAt: new Date().toISOString(),
      inputs: baseInputs,
      fetched,
      analysis,
      aiSummary: null,
      isMockData: rabbu.isMockData,
    }

    // 7. Gemini summary (non-blocking failure)
    try {
      deal.aiSummary = await generateDealSummary(deal)
    } catch {
      deal.aiSummary = null
    }

    // 8. Save to Redis (non-blocking failure)
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
