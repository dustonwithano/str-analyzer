import type { AISummary } from '@/lib/types'
import { clsx } from 'clsx'

export function AIFlagsCard({ summary }: { summary: AISummary }) {
  return (
    <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5 space-y-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280]">AI Analysis</h3>

      <p className="text-sm text-[#d1d5db] leading-relaxed">{summary.summary}</p>

      <div className="flex flex-wrap gap-4">
        {summary.greenFlags.length > 0 && (
          <div className="flex-1 min-w-[200px] space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#22c55e]">Green Flags</p>
            <div className="flex flex-col gap-1.5">
              {summary.greenFlags.map((flag, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full bg-[#052e16] text-[#22c55e] border border-[#166534] leading-tight"
                >
                  ✓ {flag}
                </span>
              ))}
            </div>
          </div>
        )}
        {summary.redFlags.length > 0 && (
          <div className="flex-1 min-w-[200px] space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#ef4444]">Red Flags</p>
            <div className="flex flex-col gap-1.5">
              {summary.redFlags.map((flag, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full bg-[#1c0505] text-[#ef4444] border border-[#7f1d1d] leading-tight"
                >
                  ✗ {flag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {summary.sensitivityNote && (
        <p className="text-xs text-[#9ca3af] italic border-t border-[#1f2937] pt-3">
          ⚡ {summary.sensitivityNote}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <span className="text-[11px] font-mono text-[#4b5563]">Confidence:</span>
        <span
          className={clsx(
            'text-[11px] font-mono font-bold px-2 py-0.5 rounded uppercase',
            summary.confidenceLevel === 'high' && 'bg-[#052e16] text-[#22c55e]',
            summary.confidenceLevel === 'medium' && 'bg-[#1c1407] text-[#f59e0b]',
            summary.confidenceLevel === 'low' && 'bg-[#1c0505] text-[#ef4444]'
          )}
        >
          {summary.confidenceLevel}
        </span>
        {summary.confidenceReason && (
          <span className="text-[11px] text-[#4b5563]">— {summary.confidenceReason}</span>
        )}
      </div>
    </div>
  )
}
