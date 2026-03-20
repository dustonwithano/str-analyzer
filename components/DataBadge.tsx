import { clsx } from 'clsx'

interface DataBadgeProps {
  source: string
  live?: boolean
}

export function DataBadge({ source, live = true }: DataBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border',
        live
          ? 'bg-[#052e16] text-[#22c55e] border-[#166534]'
          : 'bg-[#1c1407] text-[#f59e0b] border-[#92400e]'
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', live ? 'bg-[#22c55e]' : 'bg-[#f59e0b]')} />
      {source}
    </span>
  )
}
