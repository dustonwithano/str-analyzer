import { Home } from 'lucide-react'
import type { PropertyImage } from '@/lib/types'

interface PropertyImageCardProps {
  image: PropertyImage
  address: string
  thumbnail?: boolean
}

const sourceBadgeLabel: Record<string, string> = {
  streetview: 'Street View',
  places: 'Google Photos',
  zillow: 'Zillow',
}

export function PropertyImageCard({ image, address, thumbnail = false }: PropertyImageCardProps) {
  if (thumbnail) {
    if (!image.url) {
      return (
        <div className="w-20 h-14 rounded bg-[#161b27] border border-[#1f2937] flex items-center justify-center flex-shrink-0">
          <Home className="w-5 h-5 text-[#4b5563]" />
        </div>
      )
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.url}
        alt={address}
        className="w-20 h-14 rounded object-cover flex-shrink-0 border border-[#1f2937]"
      />
    )
  }

  if (!image.url) {
    return (
      <div className="w-full aspect-video rounded-lg bg-[#161b27] border border-[#1f2937] flex flex-col items-center justify-center gap-3">
        <Home className="w-10 h-10 text-[#374151]" />
        <p className="text-xs font-mono text-[#374151] text-center px-4 leading-tight">{address}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#1f2937]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={address} className="w-full h-full object-cover" />
      {image.source !== 'zillow' && sourceBadgeLabel[image.source] && (
        <span className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 text-[#9ca3af]">
          {sourceBadgeLabel[image.source]}
        </span>
      )}
    </div>
  )
}
