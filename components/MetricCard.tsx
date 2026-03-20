import { clsx } from 'clsx'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  variant?: 'default' | 'positive' | 'negative' | 'warning' | 'blue'
  large?: boolean
}

const variantStyles = {
  default: 'text-white',
  positive: 'text-[#22c55e]',
  negative: 'text-[#ef4444]',
  warning: 'text-[#f59e0b]',
  blue: 'text-[#3b82f6]',
}

export function MetricCard({ label, value, sub, variant = 'default', large = false }: MetricCardProps) {
  return (
    <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-4 flex flex-col gap-1">
      <p className="text-[11px] font-mono uppercase tracking-widest text-[#6b7280]">{label}</p>
      <p
        className={clsx(
          'font-mono font-bold leading-none',
          large ? 'text-3xl' : 'text-2xl',
          variantStyles[variant]
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#4b5563] font-mono">{sub}</p>}
    </div>
  )
}
