'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MetricCard } from '@/components/MetricCard'
import { VerdictBanner } from '@/components/VerdictBanner'
import { AIFlagsCard } from '@/components/AIFlagsCard'
import { ProjectionChart } from '@/components/ProjectionChart'
import { PropertyImageCard } from '@/components/PropertyImageCard'
import { DataBadge } from '@/components/DataBadge'
import { PageSkeleton } from '@/components/SkeletonLoader'
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/format'
import type { FullDeal } from '@/lib/types'
import { clsx } from 'clsx'
import { format } from 'date-fns'

export default function DealDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [deal, setDeal] = useState<FullDeal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reanalyzing, setReanalyzing] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/deals/${slug}`)
      if (!res.ok) throw new Error('Deal not found')
      setDeal(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [slug])

  const reanalyze = async () => {
    if (!deal) return
    setReanalyzing(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: deal.address, overrides: deal.inputs }),
      })
      if (!res.ok) throw new Error('Re-analysis failed')
      setDeal(await res.json())
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Re-analysis failed')
    } finally {
      setReanalyzing(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return (
    <div className="space-y-4">
      <Link href="/history" className="text-[#3b82f6] font-mono text-sm hover:underline">← Back to History</Link>
      <div className="bg-[#1c0505] border border-[#7f1d1d] rounded-lg p-5">
        <p className="text-[#ef4444] font-mono text-sm">{error}</p>
      </div>
    </div>
  )
  if (!deal) return null

  const verdictColor = deal.analysis.verdict === 'strong' ? 'positive' : deal.analysis.verdict === 'pass' ? 'negative' : 'warning'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/history" className="text-[11px] font-mono text-[#4b5563] hover:text-[#6b7280] transition-colors">
            ← Deal History
          </Link>
          <h1 className="text-lg font-mono font-bold text-white mt-1 leading-snug">{deal.address}</h1>
          <p className="text-[11px] font-mono text-[#4b5563] mt-0.5">
            Analyzed {format(new Date(deal.createdAt), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <button
          onClick={reanalyze}
          disabled={reanalyzing}
          className="px-4 py-2 bg-[#161b27] border border-[#1f2937] hover:border-[#3b82f6] text-white font-mono text-xs rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {reanalyzing ? 'Re-analyzing...' : '↻ Re-analyze with current rates'}
        </button>
      </div>

      {/* Property image */}
      <PropertyImageCard image={deal.fetched.propertyImage} address={deal.address} />

      {/* Verdict */}
      <VerdictBanner verdict={deal.analysis.verdict} verdictReason={deal.analysis.verdictReason} aiSummary={deal.aiSummary} />

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="Monthly Cash Flow" value={formatCurrency(deal.analysis.monthlyCashFlow)} sub="after all expenses" variant={verdictColor as 'positive' | 'negative' | 'warning'} large />
        <MetricCard label="Cash-on-Cash Return" value={formatPercent(deal.analysis.cashOnCashReturn)} sub={`on ${formatCurrency(deal.analysis.totalCashInvested)}`} variant={deal.analysis.cashOnCashReturn > 0.08 ? 'positive' : deal.analysis.cashOnCashReturn > 0.04 ? 'warning' : 'negative'} />
        <MetricCard label="Cap Rate" value={formatPercent(deal.analysis.capRate)} sub="NOI / purchase price" variant={deal.analysis.capRate > 0.06 ? 'positive' : deal.analysis.capRate > 0.04 ? 'warning' : 'negative'} />
        <MetricCard label="RevPAR" value={`$${Math.round(deal.analysis.revPAR)}`} sub="nightly rate × occupancy" variant="blue" />
        <MetricCard label="Break-even Occ." value={formatPercent(deal.analysis.breakEvenOccupancy)} variant={deal.analysis.breakEvenOccupancy < 0.55 ? 'positive' : deal.analysis.breakEvenOccupancy < 0.75 ? 'warning' : 'negative'} />
        <MetricCard label="Gross Yield" value={formatPercent(deal.analysis.grossYield)} variant="blue" />
      </div>

      {/* AI Summary */}
      {deal.aiSummary ? (
        <AIFlagsCard summary={deal.aiSummary} />
      ) : (
        <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
          <p className="text-xs font-mono text-[#4b5563]">AI summary unavailable.</p>
        </div>
      )}

      {/* Income & Expense Breakdown */}
      <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
        <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280] mb-4">Annual Income & Expenses</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#22c55e] mb-2">Income</p>
            <Row label="Nightly Revenue" value={deal.analysis.grossAnnualRevenue} />
            <Row label="Cleaning Revenue" value={deal.analysis.cleaningRevenue} />
            <Row label="Total Gross Income" value={deal.analysis.totalGrossIncome} bold />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#ef4444] mb-2">Expenses</p>
            <Row label="Mortgage (P&I)" value={deal.analysis.expenses.mortgage} neg />
            <Row label="Property Tax" value={deal.analysis.expenses.propertyTax} neg />
            <Row label="Insurance" value={deal.analysis.expenses.insurance} neg />
            <Row label="Platform Fees" value={deal.analysis.expenses.platformFees} neg />
            {!deal.inputs.selfManaging && <Row label="Management" value={deal.analysis.expenses.managementFees} neg />}
            <Row label="Cleaning Costs" value={deal.analysis.expenses.cleaningCosts} neg />
            <Row label="Maintenance" value={deal.analysis.expenses.maintenance} neg />
            <Row label="Utilities" value={deal.analysis.expenses.utilities} neg />
            <Row label="Total Expenses" value={deal.analysis.expenses.total} bold neg />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#1f2937] grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-mono text-[#6b7280]">NOI (ex-mortgage)</p>
            <p className={clsx('font-mono font-bold text-lg', deal.analysis.noi >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')}>{formatCurrency(deal.analysis.noi)}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono text-[#6b7280]">Annual Cash Flow</p>
            <p className={clsx('font-mono font-bold text-lg', deal.analysis.annualCashFlow >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')}>{formatCurrency(deal.analysis.annualCashFlow)}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono text-[#6b7280]">DSCR</p>
            <p className={clsx('font-mono font-bold', deal.analysis.dscr >= 1.25 ? 'text-[#22c55e]' : deal.analysis.dscr >= 1 ? 'text-[#f59e0b]' : 'text-[#ef4444]')}>{deal.analysis.dscr.toFixed(2)}x</p>
          </div>
          <div>
            <p className="text-[11px] font-mono text-[#6b7280]">GRM</p>
            <p className="font-mono font-bold text-white">{formatMultiple(deal.analysis.grm)}</p>
          </div>
        </div>
      </div>

      {/* Projection chart */}
      <ProjectionChart projections={deal.analysis.projections} />

      {/* Market context */}
      <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280]">STR Market Context</h3>
          <DataBadge source={deal.fetched.rabbu.source === 'gemini' ? 'Gemini AI' : 'Estimated'} live={deal.fetched.rabbu.source === 'gemini'} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <MarketCompare label="ADR" deal={`$${Math.round(deal.inputs.expectedNightlyRate)}`} market={`$${Math.round(deal.fetched.rabbu.marketADR)}`} optimistic={deal.inputs.expectedNightlyRate > deal.fetched.rabbu.marketADR * 1.05} />
          <MarketCompare label="Occupancy" deal={formatPercent(deal.inputs.occupancyRate)} market={formatPercent(deal.fetched.rabbu.marketOccupancy)} optimistic={deal.inputs.occupancyRate > deal.fetched.rabbu.marketOccupancy * 1.05} />
          <MarketCompare label="RevPAR" deal={`$${Math.round(deal.analysis.revPAR)}`} market={`$${Math.round(deal.fetched.rabbu.marketRevPAR)}`} optimistic={deal.analysis.revPAR > deal.fetched.rabbu.marketRevPAR * 1.1} />
        </div>
      </div>

      {/* Location */}
      {deal.fetched.location && (
        <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280]">STR Location Score</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-[#3b82f6]">{deal.fetched.location.overall}</span>
              <span className="text-[#4b5563] font-mono text-sm">/10</span>
              <DataBadge source={deal.fetched.location.isMockData ? 'Estimated' : 'Google'} live={!deal.fetched.location.isMockData} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(deal.fetched.location.breakdown).map(([key, score]) => (
              <ScoreBar key={key} label={key} score={score} />
            ))}
          </div>
        </div>
      )}

      {/* Data sources */}
      <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-4">
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-[#4b5563] mb-3">Data Sources</h3>
        <div className="flex flex-wrap gap-2">
          <DataBadge source={deal.fetched.rabbu.source === 'gemini' ? 'Gemini AI' : 'Estimated'} live={deal.fetched.rabbu.source === 'gemini'} />
          <DataBadge source="Zillow" live={deal.fetched.zillow?.source === 'live'} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold = false, neg = false }: { label: string; value: number; bold?: boolean; neg?: boolean }) {
  return (
    <div className={clsx('flex justify-between text-xs font-mono', bold && 'border-t border-[#1f2937] pt-2 mt-1')}>
      <span className={bold ? 'text-white font-bold' : 'text-[#6b7280]'}>{label}</span>
      <span className={clsx(bold ? 'font-bold' : '', neg ? 'text-[#ef4444]' : 'text-[#22c55e]')}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function MarketCompare({ label, deal, market, optimistic }: { label: string; deal: string; market: string; optimistic: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-mono uppercase tracking-wider text-[#4b5563]">{label}</p>
      <p className={clsx('text-sm font-mono font-bold', optimistic ? 'text-[#f59e0b]' : 'text-white')}>{deal}</p>
      <p className="text-[11px] font-mono text-[#4b5563]">mkt: {market}</p>
      {optimistic && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#1c1407] text-[#f59e0b] border border-[#92400e]">OPTIMISTIC</span>}
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const emoji: Record<string, string> = { restaurants: '🍽', attractions: '🎯', beach: '🏖', transit: '🚌', airport: '✈' }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono capitalize text-[#6b7280]">{emoji[label] ?? '📍'} {label}</span>
        <span className="text-[11px] font-mono text-white font-bold">{score}/10</span>
      </div>
      <div className="h-1.5 bg-[#1f2937] rounded-full overflow-hidden">
        <div className="h-full bg-[#3b82f6] rounded-full transition-all" style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  )
}
