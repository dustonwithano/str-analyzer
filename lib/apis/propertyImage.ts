import type { PropertyImage } from '../types'

export async function getPropertyImage(
  address: string,
  zpid?: string | null,
  imgSrc?: string | null,
  placeId?: string | null
): Promise<PropertyImage> {
  // 1. Zillow photo
  if (imgSrc) {
    return { url: imgSrc, source: 'zillow', isFallback: false }
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return { url: null, source: 'placeholder', isFallback: true }
  }

  const encoded = encodeURIComponent(address)

  // 2. Google Street View (check metadata first to avoid grey images)
  try {
    const metaRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encoded}&key=${apiKey}`
    )
    const meta = await metaRes.json()
    if (meta.status === 'OK') {
      const url = `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${encoded}&key=${apiKey}`
      return { url, source: 'streetview', isFallback: false }
    }
  } catch {}

  // 3. Google Places photo
  if (placeId) {
    try {
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`
      )
      const details = await detailsRes.json()
      const photoRef = details.result?.photos?.[0]?.photo_reference
      if (photoRef) {
        const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${photoRef}&key=${apiKey}`
        return { url, source: 'places', isFallback: false }
      }
    } catch {}
  }

  // 4. Placeholder
  return { url: null, source: 'placeholder', isFallback: true }
}
