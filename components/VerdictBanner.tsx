import { clsx } from 'clsx'
import type { AISummary, DealAnalysis } from '@/lib/types'

interface VerdictBannerProps {
  verdict: DealAnalysis['verdict']
  verdictReason: string
  aiSummary?: AISummary | null
}

const verdictConfig = {
  strong: {
    bg: 'bg-[#052e16]',
    border: 'border-[#166534]',
    badge: 'bg-[#166534] text-[#22c55e]',
    text: 'text-[#22c55e]',
    label: 'STRONG BUY',
  },
  marginal: {
    bg: 'bg-[#1c1407]',
    border: 'border-[#92400e]',
    badge: 'bg-[#92400e] text-[#f59e0b]',
    text: 'text-[#f59e0b]',
    label: 'MARGINAL',
  },
  pass: {
    bg: 'bg-[#1c0505]',
    border: 'border-[#7f1d1d]',
    badge: 'bg-[#7f1d1d] text-[#ef4444]',
    text: 'text-[#ef4444]',
    label: 'PASS',
  },
}

const recBadge: Record<string, string> = {
  buy: 'bg-[#052e16] text-[#22c55e] border border-[#166534]',
  negotiate: 'bg-[#1c1407] text-[#f59e0b] border border-[#92400e]',
  pass: 'bg-[#1c0505] text-[#ef4444] border border-[#7f1d1d]',
}

export function VerdictBanner({ verdict, verdictReason, aiSummary }: VerdictBannerProps) {
  const cfg = verdictConfig[verdict]
  const headline = aiSummary?.headline ?? verdictReason

  return (
    <div className={clsx('rounded-lg border p-5', cfg.bg, cfg.border)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={clsx('text-xs font-mono font-bold px-2 py-0.5 rounded', cfg.badge)}>
              {cfg.label}
            </span>
            {aiSummary?.strategyRecommendation && (
              <span
                className={clsx(
                  'text-xs font-mono font-bold px-2 py-0.5 rounded uppercase',
                  recBadge[aiSummary.strategyRecommendation] ?? recBadge.negotiate
                )}
              >
                {aiSummary.strategyRecommendation}
              </span>
            )}
          </div>
          <p className={clsx('font-medium text-sm leading-snug', cfg.text)}>{headline}</p>
        </div>
      </div>
    </div>
  )
}
