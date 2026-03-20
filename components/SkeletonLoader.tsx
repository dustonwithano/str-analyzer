export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5 animate-pulse space-y-3">
      <div className="h-2.5 bg-[#1f2937] rounded w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#1f2937] rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  )
}

export function MetricGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[#161b27] border border-[#1f2937] rounded-lg p-4 animate-pulse space-y-2">
          <div className="h-2 bg-[#1f2937] rounded w-2/3" />
          <div className="h-7 bg-[#1f2937] rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-[#161b27] rounded-lg animate-pulse" />
      <MetricGridSkeleton />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={2} />
    </div>
  )
}
