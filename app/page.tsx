'use client'

import { useState, useEffect } from 'react'
import { MetricCard } from '@/components/MetricCard'
import { VerdictBanner } from '@/components/VerdictBanner'
import { AIFlagsCard } from '@/components/AIFlagsCard'
import { ProjectionChart } from '@/components/ProjectionChart'
import { PropertyImageCard } from '@/components/PropertyImageCard'
import { DataBadge } from '@/components/DataBadge'
import { InputSection, InputField, ToggleField } from '@/components/InputSection'
import { PageSkeleton } from '@/components/SkeletonLoader'
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/format'
import type { FullDeal, DealInputs } from '@/lib/types'
import { clsx } from 'clsx'

type Status = 'idle' | 'fetching' | 'done' | 'error'

function toNum(s: string) {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export default function AnalyzerPage() {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [deal, setDeal] = useState<FullDeal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [redisSaved, setRedisSaved] = useState(true)

  // Editable inputs (initialized from deal after first fetch)
  const [inputs, setInputs] = useState<Partial<DealInputs>>({})

  useEffect(() => {
    fetch('/api/rates')
      .then((r) => r.json())
      .then((d) => { if (d.rate) setCurrentRate(d.rate) })
      .catch(() => {})
  }, [])

  const setInput = (key: keyof DealInputs, value: string | boolean) => {
    setInputs((prev) => ({
      ...prev,
      [key]: typeof value === 'boolean' ? value : toNum(value as string),
    }))
  }

  const analyze = async (overrides?: Partial<DealInputs>) => {
    if (!address.trim()) return
    setStatus('fetching')
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), overrides }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setDeal(data)
      setRedisSaved(data.redisSaved !== false)
      // Initialize editable inputs from returned deal
      setInputs({})
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const rerun = () => {
    if (!deal) return
    // Merge deal inputs with any user overrides
    const merged: Partial<DealInputs> = {}
    const base = deal.inputs
    const keys = Object.keys(base) as (keyof DealInputs)[]
    for (const k of keys) {
      if (k in inputs) {
        ;(merged as Record<string, unknown>)[k] = inputs[k]
      }
    }
    analyze(merged)
  }

  const inp = deal ? { ...deal.inputs, ...inputs } : null

  const verdictColor = deal?.analysis.verdict === 'strong'
    ? 'positive'
    : deal?.analysis.verdict === 'pass'
    ? 'negative'
    : 'warning'

  return (
    <div className="space-y-6">
      {/* Address input */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Enter property address (e.g. 42 Atlantic Ave, Wells, ME 04090)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && status !== 'fetching' && analyze()}
          className="flex-1 bg-[#161b27] border border-[#1f2937] rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-[#374151] focus:outline-none focus:border-[#3b82f6] transition-colors"
        />
        <button
          onClick={() => analyze()}
          disabled={status === 'fetching' || !address.trim()}
          className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#1e3a5f] disabled:text-[#374151] text-white font-mono font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
        >
          {status === 'fetching' ? 'Analyzing...' : 'Analyze Deal'}
        </button>
      </div>

      {currentRate && status === 'idle' && (
        <p className="text-[11px] font-mono text-[#4b5563]">
          Current 30-yr rate: <span className="text-[#3b82f6]">{formatPercent(currentRate, 2)}</span>
          {' '}(FRED)
        </p>
      )}

      {!redisSaved && (
        <div className="text-xs font-mono text-[#f59e0b] bg-[#1c1407] border border-[#92400e] rounded px-3 py-2">
          ⚠ Deal analyzed but not saved (Redis unavailable)
        </div>
      )}

      {status === 'fetching' && <PageSkeleton />}

      {status === 'error' && (
        <div className="bg-[#1c0505] border border-[#7f1d1d] rounded-lg p-5">
          <p className="text-[#ef4444] font-mono text-sm font-bold mb-1">Analysis Failed</p>
          <p className="text-[#9ca3af] text-sm">{error}</p>
        </div>
      )}

      {status === 'done' && deal && inp && (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
          {/* ── Left: Input Panel ── */}
          <div className="space-y-5">
            <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-widest text-[#6b7280]">Assumptions</h2>
                <button
                  onClick={rerun}
                  className="text-[11px] font-mono px-3 py-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded transition-colors"
                >
                  Re-run
                </button>
              </div>

              <InputSection title="Financing">
                <InputField label="Purchase Price" value={inp.purchasePrice} onChange={(v) => setInput('purchasePrice', v)} />
                <InputField label="Down Payment %" value={inp.downPaymentPct * 100} onChange={(v) => setInput('downPaymentPct', String(toNum(v) / 100))} step="1" />
                <InputField
                  label="Interest Rate %"
                  value={(inp.interestRate * 100).toFixed(2)}
                  onChange={(v) => setInput('interestRate', String(toNum(v) / 100))}
                  step="0.01"
                  badge={deal.fetched.rabbu.source === 'gemini' ? 'Gemini' : 'Est'}
                />
                <InputField label="Loan Term (yrs)" value={inp.loanTermYears} onChange={(v) => setInput('loanTermYears', v)} step="1" />
              </InputSection>

              <InputSection title="STR Performance">
                <InputField
                  label="Nightly Rate $"
                  value={inp.expectedNightlyRate}
                  onChange={(v) => setInput('expectedNightlyRate', v)}
                  badge={deal.fetched.rabbu.source === 'gemini' ? 'Gemini' : 'Est'}
                />
                <InputField
                  label="Occupancy %"
                  value={(inp.occupancyRate * 100).toFixed(0)}
                  onChange={(v) => setInput('occupancyRate', String(toNum(v) / 100))}
                  step="1"
                  badge={deal.fetched.rabbu.source === 'gemini' ? 'Gemini' : 'Est'}
                />
                <InputField label="Avg Stay (nights)" value={inp.avgStayLengthNights} onChange={(v) => setInput('avgStayLengthNights', v)} step="0.5" />
              </InputSection>

              <InputSection title="Costs">
                <InputField label="Rehab $" value={inp.rehabCost} onChange={(v) => setInput('rehabCost', v)} />
                <InputField label="Furnishing $" value={inp.furnishingCost} onChange={(v) => setInput('furnishingCost', v)} />
                <InputField label="Property Tax $" value={inp.propertyTaxAnnual} onChange={(v) => setInput('propertyTaxAnnual', v)} />
                <InputField label="Insurance $/yr" value={inp.insuranceAnnual} onChange={(v) => setInput('insuranceAnnual', v)} />
                <InputField label="Utilities $/mo" value={inp.utilitiesMonthly} onChange={(v) => setInput('utilitiesMonthly', v)} />
              </InputSection>

              <InputSection title="Operations">
                <InputField label="Mgmt Fee %" value={(inp.managementFeePct * 100).toFixed(0)} onChange={(v) => setInput('managementFeePct', String(toNum(v) / 100))} step="1" />
                <InputField label="Platform Fee %" value={(inp.platformFeePct * 100).toFixed(0)} onChange={(v) => setInput('platformFeePct', String(toNum(v) / 100))} step="0.5" />
                <InputField label="Cleaning Fee $" value={inp.cleaningFeePerStay} onChange={(v) => setInput('cleaningFeePerStay', v)} />
                <InputField label="Cleaning Cost $" value={inp.cleaningCostPerStay} onChange={(v) => setInput('cleaningCostPerStay', v)} />
                <InputField label="Maintenance %" value={(inp.maintenancePct * 100).toFixed(0)} onChange={(v) => setInput('maintenancePct', String(toNum(v) / 100))} step="1" />
                <ToggleField label="Self-Managing" checked={inp.selfManaging} onChange={(v) => setInputs((p) => ({ ...p, selfManaging: v }))} />
              </InputSection>
            </div>
          </div>

          {/* ── Right: Results Panel ── */}
          <div className="space-y-5">
            {/* Property image */}
            <PropertyImageCard image={deal.fetched.propertyImage} address={deal.address} />

            {/* Verdict */}
            <VerdictBanner
              verdict={deal.analysis.verdict}
              verdictReason={deal.analysis.verdictReason}
              aiSummary={deal.aiSummary}
            />

            {/* Key metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard
                label="Monthly Cash Flow"
                value={formatCurrency(deal.analysis.monthlyCashFlow)}
                sub="after all expenses"
                variant={verdictColor as 'positive' | 'negative' | 'warning'}
                large
              />
              <MetricCard
                label="Cash-on-Cash Return"
                value={formatPercent(deal.analysis.cashOnCashReturn)}
                sub={`on ${formatCurrency(deal.analysis.totalCashInvested)} invested`}
                variant={deal.analysis.cashOnCashReturn > 0.08 ? 'positive' : deal.analysis.cashOnCashReturn > 0.04 ? 'warning' : 'negative'}
              />
              <MetricCard
                label="Cap Rate"
                value={formatPercent(deal.analysis.capRate)}
                sub="NOI / purchase price"
                variant={deal.analysis.capRate > 0.06 ? 'positive' : deal.analysis.capRate > 0.04 ? 'warning' : 'negative'}
              />
              <MetricCard
                label="RevPAR"
                value={`$${Math.round(deal.analysis.revPAR)}`}
                sub="nightly rate × occupancy"
                variant="blue"
              />
              <MetricCard
                label="Break-even Occ."
                value={formatPercent(deal.analysis.breakEvenOccupancy)}
                sub={`need ${formatPercent(deal.analysis.breakEvenOccupancy)} to break even`}
                variant={deal.analysis.breakEvenOccupancy < 0.55 ? 'positive' : deal.analysis.breakEvenOccupancy < 0.75 ? 'warning' : 'negative'}
              />
              <MetricCard
                label="Gross Yield"
                value={formatPercent(deal.analysis.grossYield)}
                sub="gross rev / price"
                variant="blue"
              />
            </div>

            {/* AI Summary */}
            {deal.aiSummary ? (
              <AIFlagsCard summary={deal.aiSummary} />
            ) : (
              <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
                <p className="text-xs font-mono text-[#4b5563]">AI summary unavailable — set GEMINI_API_KEY to enable.</p>
              </div>
            )}

            {/* Income & Expense Breakdown */}
            <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280] mb-4">
                Annual Income & Expenses
              </h3>
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
                  {!inp.selfManaging && <Row label="Management" value={deal.analysis.expenses.managementFees} neg />}
                  <Row label="Cleaning Costs" value={deal.analysis.expenses.cleaningCosts} neg />
                  <Row label="Maintenance" value={deal.analysis.expenses.maintenance} neg />
                  <Row label="Utilities" value={deal.analysis.expenses.utilities} neg />
                  <Row label="Total Expenses" value={deal.analysis.expenses.total} bold neg />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#1f2937] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-mono text-[#6b7280]">NOI (ex-mortgage)</p>
                  <p className={clsx('font-mono font-bold text-lg', deal.analysis.noi >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')}>
                    {formatCurrency(deal.analysis.noi)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-mono text-[#6b7280]">Annual Cash Flow</p>
                  <p className={clsx('font-mono font-bold text-lg', deal.analysis.annualCashFlow >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')}>
                    {formatCurrency(deal.analysis.annualCashFlow)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-mono text-[#6b7280]">DSCR</p>
                  <p className={clsx('font-mono font-bold', deal.analysis.dscr >= 1.25 ? 'text-[#22c55e]' : deal.analysis.dscr >= 1 ? 'text-[#f59e0b]' : 'text-[#ef4444]')}>
                    {deal.analysis.dscr.toFixed(2)}x
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-mono text-[#6b7280]">GRM</p>
                  <p className="font-mono font-bold text-white">{formatMultiple(deal.analysis.grm)}</p>
                </div>
              </div>
            </div>

            {/* Projection chart */}
            <ProjectionChart projections={deal.analysis.projections} />

            {/* Market Context */}
            <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280]">
                  STR Market Context
                </h3>
                <DataBadge source={deal.fetched.rabbu.source === 'gemini' ? 'Gemini AI' : 'Estimated'} live={deal.fetched.rabbu.source === 'gemini'} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <MarketCompare
                  label="ADR"
                  deal={`$${Math.round(deal.inputs.expectedNightlyRate)}`}
                  market={`$${Math.round(deal.fetched.rabbu.marketADR)}`}
                  optimistic={deal.inputs.expectedNightlyRate > deal.fetched.rabbu.marketADR * 1.05}
                />
                <MarketCompare
                  label="Occupancy"
                  deal={formatPercent(deal.inputs.occupancyRate)}
                  market={formatPercent(deal.fetched.rabbu.marketOccupancy)}
                  optimistic={deal.inputs.occupancyRate > deal.fetched.rabbu.marketOccupancy * 1.05}
                />
                <MarketCompare
                  label="RevPAR"
                  deal={`$${Math.round(deal.analysis.revPAR)}`}
                  market={`$${Math.round(deal.fetched.rabbu.marketRevPAR)}`}
                  optimistic={deal.analysis.revPAR > deal.fetched.rabbu.marketRevPAR * 1.1}
                />
              </div>
            </div>

            {/* Location Score */}
            {deal.fetched.location && (
              <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280]">
                    STR Location Score
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono font-bold text-[#3b82f6]">
                      {deal.fetched.location.overall}
                    </span>
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

            {/* Data Sources */}
            <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-4">
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-[#4b5563] mb-3">Data Sources</h3>
              <div className="flex flex-wrap gap-2">
                <DataBadge source={deal.fetched.rabbu.source === 'gemini' ? 'Gemini AI' : 'Estimated'} live={deal.fetched.rabbu.source === 'gemini'} />
                <DataBadge source="Zillow" live={deal.fetched.zillow?.source === 'live'} />
              </div>
              <p className="text-[10px] font-mono text-[#374151] mt-2">
                Analyzed: {new Date(deal.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
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
      {optimistic && (
        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#1c1407] text-[#f59e0b] border border-[#92400e]">
          OPTIMISTIC
        </span>
      )}
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const emoji: Record<string, string> = {
    restaurants: '🍽',
    attractions: '🎯',
    beach: '🏖',
    transit: '🚌',
    airport: '✈',
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono capitalize text-[#6b7280]">
          {emoji[label] ?? '📍'} {label}
        </span>
        <span className="text-[11px] font-mono text-white font-bold">{score}/10</span>
      </div>
      <div className="h-1.5 bg-[#1f2937] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#3b82f6] rounded-full transition-all"
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  )
}
