'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatPercent } from '@/lib/format'
import { PropertyImageCard } from './PropertyImageCard'
import type { DealSummary } from '@/lib/types'
import { clsx } from 'clsx'
import { format } from 'date-fns'

type SortKey = 'createdAt' | 'purchasePrice' | 'monthlyCashFlow' | 'cashOnCashReturn' | 'capRate'

const verdictStyle = {
  strong: 'bg-[#052e16] text-[#22c55e] border-[#166534]',
  marginal: 'bg-[#1c1407] text-[#f59e0b] border-[#92400e]',
  pass: 'bg-[#1c0505] text-[#ef4444] border-[#7f1d1d]',
}

interface DealTableProps {
  deals: DealSummary[]
  onDelete: (id: string) => void
}

export function DealTable({ deals, onDelete }: DealTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...deals].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    if (typeof va === 'string' && typeof vb === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const th = (key: SortKey, label: string) => (
    <th
      className="text-left text-[11px] font-mono uppercase tracking-wider text-[#6b7280] cursor-pointer hover:text-white transition-colors pb-3 pr-4"
      onClick={() => handleSort(key)}
    >
      {label} {sortKey === key && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#1f2937]">
            <th className="text-left text-[11px] font-mono uppercase tracking-wider text-[#6b7280] pb-3 pr-4">
              Property
            </th>
            {th('createdAt', 'Date')}
            {th('purchasePrice', 'Price')}
            {th('monthlyCashFlow', 'Mo. Cash Flow')}
            {th('cashOnCashReturn', 'CoC Return')}
            {th('capRate', 'Cap Rate')}
            <th className="text-left text-[11px] font-mono uppercase tracking-wider text-[#6b7280] pb-3 pr-4">
              Verdict
            </th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((deal) => (
            <tr
              key={deal.id}
              className="border-b border-[#1f2937] hover:bg-[#161b27] transition-colors"
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  {deal.propertyImage && (
                    <PropertyImageCard
                      image={deal.propertyImage}
                      address={deal.address}
                      thumbnail
                    />
                  )}
                  <span className="text-sm text-[#d1d5db] font-mono leading-tight max-w-[200px]">
                    {deal.address}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-4 text-sm font-mono text-[#6b7280] whitespace-nowrap">
                {format(new Date(deal.createdAt), 'MMM d, yyyy')}
              </td>
              <td className="py-3 pr-4 text-sm font-mono text-white whitespace-nowrap">
                {formatCurrency(deal.purchasePrice)}
              </td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <span
                  className={clsx(
                    'text-sm font-mono font-bold',
                    deal.monthlyCashFlow >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                  )}
                >
                  {formatCurrency(deal.monthlyCashFlow)}/mo
                </span>
              </td>
              <td className="py-3 pr-4 text-sm font-mono text-white whitespace-nowrap">
                {formatPercent(deal.cashOnCashReturn)}
              </td>
              <td className="py-3 pr-4 text-sm font-mono text-white whitespace-nowrap">
                {formatPercent(deal.capRate)}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={clsx(
                    'text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase',
                    verdictStyle[deal.verdict]
                  )}
                >
                  {deal.verdict}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="text-[11px] font-mono text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                  >
                    View →
                  </Link>
                  <button
                    onClick={() => onDelete(deal.id)}
                    className="text-[11px] font-mono text-[#4b5563] hover:text-[#ef4444] transition-colors"
                  >
                    Del
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
