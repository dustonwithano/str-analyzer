import type { RabbuData } from '../types'

// Realistic STR market data for Wells, Maine (04090)
// Wells is a coastal beach town in southern Maine — popular summer destination
// Data reflects seasonal averaging across year (peak summer rates $350+/night, shoulder ~$180)
const WELLS_MAINE_MOCK: RabbuData = {
  adr: 245,
  occupancyRate: 0.68,
  revPAR: 166.6,
  marketADR: 235,
  marketOccupancy: 0.65,
  marketRevPAR: 152.75,
  isMockData: true,
  source: 'mock',
}

export async function fetchRabbuData(zipCode: string, city: string): Promise<RabbuData> {
  try {
    const apiKey = process.env.RABBU_API_KEY
    if (!apiKey) return WELLS_MAINE_MOCK

    const res = await fetch(
      `https://api.rabbu.com/v1/market?zipCode=${encodeURIComponent(zipCode)}&city=${encodeURIComponent(city)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!res.ok) throw new Error(`Rabbu API error: ${res.status}`)
    const data = await res.json()

    return {
      adr: data.averageDailyRate ?? WELLS_MAINE_MOCK.adr,
      occupancyRate: data.occupancyRate != null ? data.occupancyRate / 100 : WELLS_MAINE_MOCK.occupancyRate,
      revPAR: data.revPAR ?? WELLS_MAINE_MOCK.revPAR,
      marketADR: data.marketADR ?? WELLS_MAINE_MOCK.marketADR,
      marketOccupancy: data.marketOccupancy != null ? data.marketOccupancy / 100 : WELLS_MAINE_MOCK.marketOccupancy,
      marketRevPAR: data.marketRevPAR ?? WELLS_MAINE_MOCK.marketRevPAR,
      isMockData: false,
      source: 'live',
    }
  } catch {
    return WELLS_MAINE_MOCK
  }
}
