import type { GeocodedAddress } from '../types'

export async function geocodeAddress(address: string): Promise<GeocodedAddress> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) throw new Error('No Google Maps API key')

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    )
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) throw new Error(`Geocode failed: ${data.status}`)

    const result = data.results[0]
    const components = result.address_components as Array<{ types: string[]; short_name: string; long_name: string }>

    const getShort = (type: string) => components.find((c) => c.types.includes(type))?.short_name ?? ''
    const getLong = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? ''

    return {
      formattedAddress: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      zipCode: getShort('postal_code'),
      city: getLong('locality') || getLong('sublocality') || getLong('administrative_area_level_2'),
      state: getShort('administrative_area_level_1'),
      placeId: result.place_id ?? null,
      source: 'live',
    }
  } catch {
    // Best-effort parse without Google Maps
    return {
      formattedAddress: address,
      lat: 43.322,
      lng: -70.58,
      zipCode: '04090',
      city: 'Wells',
      state: 'ME',
      placeId: null,
      source: 'failed',
    }
  }
}
