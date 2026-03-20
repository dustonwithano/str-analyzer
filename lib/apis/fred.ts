import type { FredData } from '../types'

export async function fetchMortgageRate(): Promise<FredData> {
  try {
    const apiKey = process.env.FRED_API_KEY || 'abcdefghijklmnopqrstuvwxyz123456'
    const params = new URLSearchParams({
      series_id: 'MORTGAGE30US',
      api_key: apiKey,
      file_type: 'json',
      limit: '1',
      sort_order: 'desc',
    })

    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?${params}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`FRED API error: ${res.status}`)

    const data = await res.json()
    const obs = data.observations?.[0]
    if (!obs || obs.value === '.') throw new Error('No observation data')

    return {
      rate: parseFloat(obs.value) / 100,
      date: obs.date,
      source: 'live',
    }
  } catch {
    return { rate: 0.0695, date: null, source: 'failed' }
  }
}
