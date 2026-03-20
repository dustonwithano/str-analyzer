import type { RentcastData } from '../types'

export async function fetchRentcastData(address: string, beds = 3): Promise<RentcastData> {
  try {
    const apiKey = process.env.RENTCAST_API_KEY
    if (!apiKey) throw new Error('No Rentcast API key')

    const headers = { 'X-Api-Key': apiKey }

    const [rentRes, marketRes] = await Promise.allSettled([
      fetch(
        `https://api.rentcast.io/v1/avm/rent/long-term?address=${encodeURIComponent(address)}&bedrooms=${beds}`,
        { headers }
      ),
      fetch(
        `https://api.rentcast.io/v1/markets?address=${encodeURIComponent(address)}`,
        { headers }
      ),
    ])

    let rentEstimate: number | null = null
    let medianRent: number | null = null
    let vacancyRate: number | null = null

    if (rentRes.status === 'fulfilled' && rentRes.value.ok) {
      const d = await rentRes.value.json()
      rentEstimate = d.rent ?? null
    }

    if (marketRes.status === 'fulfilled' && marketRes.value.ok) {
      const d = await marketRes.value.json()
      medianRent = d.rentalData?.averageRent ?? null
      vacancyRate = d.rentalData?.vacancyRate != null ? d.rentalData.vacancyRate / 100 : null
    }

    return { rentEstimate, medianRent, vacancyRate, source: 'live' }
  } catch {
    return { rentEstimate: null, medianRent: null, vacancyRate: null, source: 'failed' }
  }
}
