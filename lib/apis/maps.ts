import type { LocationScore } from '../types'

// Realistic location scores for Wells, Maine (04090) — coastal beach town
const WELLS_MAINE_LOCATION: LocationScore = {
  overall: 7,
  breakdown: {
    restaurants: 6,   // Good selection in Wells & nearby Ogunquit
    attractions: 8,   // Wells Beach, Rachel Carson Wildlife Refuge, Ogunquit Village
    beach: 10,        // Directly on the southern Maine coast
    transit: 2,       // Rural Maine — very car-dependent
    airport: 4,       // Portland Jetport ~45 min; Boston Logan ~90 min
  },
  isMockData: true,
  source: 'mock',
}

export async function getLocationScore(
  _address: string,
  lat: number,
  lng: number
): Promise<LocationScore> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) return WELLS_MAINE_LOCATION

    const categories = [
      { key: 'restaurants', type: 'restaurant', radius: 2000 },
      { key: 'attractions', type: 'tourist_attraction', radius: 5000 },
      { key: 'beach', type: 'natural_feature', radius: 3000 },
      { key: 'transit', type: 'bus_station', radius: 1500 },
      { key: 'airport', type: 'airport', radius: 80000 },
    ]

    const scores: Record<string, number> = {}

    await Promise.all(
      categories.map(async ({ key, type, radius }) => {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`
          )
          const data = await res.json()
          const count = data.results?.length ?? 0

          if (key === 'airport') {
            scores[key] = count > 0 ? Math.min(9, Math.max(2, 10 - Math.floor(count * 0.3))) : 3
          } else if (key === 'transit') {
            scores[key] = Math.min(10, Math.max(1, count * 2))
          } else {
            scores[key] = Math.min(10, Math.max(1, Math.floor(count / 3) + 2))
          }
        } catch {
          scores[key] = 5
        }
      })
    )

    const overall = Math.round(
      ((scores.restaurants ?? 5) +
        (scores.attractions ?? 5) +
        (scores.beach ?? 5) +
        (scores.transit ?? 5) +
        (scores.airport ?? 5)) /
        5
    )

    return {
      overall,
      breakdown: {
        restaurants: scores.restaurants ?? 5,
        attractions: scores.attractions ?? 5,
        beach: scores.beach ?? 5,
        transit: scores.transit ?? 5,
        airport: scores.airport ?? 5,
      },
      isMockData: false,
      source: 'live',
    }
  } catch {
    return WELLS_MAINE_LOCATION
  }
}
