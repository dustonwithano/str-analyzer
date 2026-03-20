import type { RabbuData } from '../types'

// Fallback mock data for Wells, Maine (04090)
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

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

export async function fetchRabbuData(zipCode: string, city: string, state = ''): Promise<RabbuData> {
  try {
    const apiKey = process.env.AIRROI_API_KEY
    if (!apiKey) return WELLS_MAINE_MOCK

    const region = STATE_NAMES[state.toUpperCase()] ?? state

    const res = await fetch('https://api.airroi.com/markets/metrics/all', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        market: {
          country: 'US',
          region,
          locality: city,
        },
        currency: 'usd',
      }),
    })

    if (!res.ok) throw new Error(`AirROI API error: ${res.status}`)
    const json = await res.json()
    const d = json.payload ?? json

    const adr = d.average_daily_rate ?? d.adr ?? WELLS_MAINE_MOCK.adr
    const occupancy = d.occupancy ?? d.occupancy_rate ?? WELLS_MAINE_MOCK.occupancyRate
    const revPAR = d.revpar ?? d.rev_par ?? d.revPAR ?? adr * occupancy

    return {
      adr,
      occupancyRate: occupancy,
      revPAR,
      marketADR: d.market_adr ?? d.marketADR ?? adr,
      marketOccupancy: d.market_occupancy ?? d.marketOccupancy ?? occupancy,
      marketRevPAR: d.market_revpar ?? d.marketRevPAR ?? revPAR,
      isMockData: false,
      source: 'live',
    }
  } catch {
    return WELLS_MAINE_MOCK
  }
}
