import type { ZillowData } from '../types'

export async function fetchZillowData(address: string): Promise<ZillowData> {
  try {
    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) throw new Error('No RapidAPI key')

    const res = await fetch(
      `https://zillow-com1.p.rapidapi.com/property?address=${encodeURIComponent(address)}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'zillow-com1.p.rapidapi.com',
        },
      }
    )
    if (!res.ok) throw new Error(`Zillow API error: ${res.status}`)
    const data = await res.json()

    const listPrice = data.price ?? data.listPrice ?? null
    const propertyTaxAnnual =
      data.propertyTaxRate && listPrice
        ? listPrice * (data.propertyTaxRate / 100)
        : data.annualHomeownersInsurance
        ? null
        : null

    return {
      listPrice,
      beds: data.bedrooms ?? null,
      baths: data.bathrooms ?? null,
      sqft: data.livingArea ?? data.sqft ?? null,
      yearBuilt: data.yearBuilt ?? null,
      propertyTaxAnnual,
      zestimate: data.zestimate ?? null,
      zpid: data.zpid ? String(data.zpid) : null,
      imgSrc: data.imgSrc ?? data.photos?.[0]?.url ?? null,
      priceHistory: data.priceHistory ?? null,
      source: 'live',
    }
  } catch {
    return {
      listPrice: null,
      beds: null,
      baths: null,
      sqft: null,
      yearBuilt: null,
      propertyTaxAnnual: null,
      zestimate: null,
      zpid: null,
      imgSrc: null,
      priceHistory: null,
      source: 'failed',
    }
  }
}
