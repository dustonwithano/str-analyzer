'use client'

import { useState } from 'react'
import { MetricCard } from '@/components/MetricCard'
import { VerdictBanner } from '@/components/VerdictBanner'
import { AIFlagsCard } from '@/components/AIFlagsCard'
import { ProjectionChart } from '@/components/ProjectionChart'
import { PropertyImageCard } from '@/components/PropertyImageCard'
import { DataBadge } from '@/components/DataBadge'
import { PageSkeleton } from '@/components/SkeletonLoader'
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/format'
import type { FullDeal, DealInputs } from '@/lib/types'
import { clsx } from 'clsx'

type Status = 'idle' | 'loading' | 'form' | 'analyzing' | 'done' | 'error'

interface AssumptionsForm {
  purchasePrice: string
  downPaymentPct: string
  interestRate: string
  loanTermYears: string
  expectedNightlyRate: string
  occupancyRate: string
  avgStayLengthNights: string
  rehabCost: string
  furnishingCost: string
  propertyTaxAnnual: string
  insuranceAnnual: string
  utilitiesMonthly: string
  platformFeePct: string
  managementFeePct: string
  cleaningFeePerStay: string
  cleaningCostPerStay: string
  maintenancePct: string
  selfManaging: boolean
}

interface PropertyMeta { beds: string; baths: string; sqft: string; zillowLive: boolean }

const DEFAULTS: AssumptionsForm = {
  purchasePrice: '',
  downPaymentPct: '25',
  interestRate: '',
  loanTermYears: '30',
  expectedNightlyRate: '',
  occupancyRate: '',
  avgStayLengthNights: '3',
  rehabCost: '',
  furnishingCost: '',
  propertyTaxAnnual: '',
  insuranceAnnual: '',
  utilitiesMonthly: '',
  platformFeePct: '3',
  managementFeePct: '0',
  cleaningFeePerStay: '',
  cleaningCostPerStay: '',
  maintenancePct: '5',
  selfManaging: false,
}

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export default function AnalyzerPage() {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [assumptions, setAssumptions] = useState<AssumptionsForm>(DEFAULTS)
  const [propertyMeta, setPropertyMeta] = useState<PropertyMeta>({ beds: '', baths: '', sqft: '', zillowLive: false })
  const [geminiLoaded, setGeminiLoaded] = useState(false)
  const [deal, setDeal] = useState<FullDeal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [redisSaved, setRedisSaved] = useState(true)
  const [inputs, setInputs] = useState<Partial<DealInputs>>({})

  const setInput = (key: keyof DealInputs, value: string | boolean) => {
    setInputs((prev) => ({
      ...prev,
      [key]: typeof value === 'boolean' ? value : parseNum(value as string),
    }))
  }

  const setField = (key: keyof AssumptionsForm, value: string | boolean) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }))
  }

  // Step 1 → Step 2: fetch property data + market estimates in parallel
  const loadAll = async () => {
    if (!address.trim()) return
    setStatus('loading')
    setGeminiLoaded(false)

    try {
      const params = new URLSearchParams({ address: address.trim() })
      const [propRes, mktRes] = await Promise.all([
        fetch(`/api/property?${params}`),
        fetch(`/api/market?${params}`),
      ])
      const prop = propRes.ok ? await propRes.json() : {}
      const mkt = mktRes.ok ? await mktRes.json() : {}

      setPropertyMeta({
        beds: String(prop.beds ?? ''),
        baths: String(prop.baths ?? ''),
        sqft: String(prop.sqft ?? ''),
        zillowLive: prop.source === 'live',
      })

      setAssumptions({
        ...DEFAULTS,
        purchasePrice: String(prop.listPrice ?? prop.zestimate ?? ''),
        interestRate: mkt.mortgageRate ? (mkt.mortgageRate * 100).toFixed(2) : '',
        expectedNightlyRate: mkt.adr ? String(Math.round(mkt.adr)) : '',
        occupancyRate: mkt.occupancyRate ? String(Math.round(mkt.occupancyRate * 100)) : '',
      })
      setGeminiLoaded(!!mkt.adr)
    } catch {
      // Still show form even if APIs fail
    }
    setStatus('form')
  }

  const toOverrides = (a: AssumptionsForm): Partial<DealInputs> => ({
    purchasePrice: parseNum(a.purchasePrice),
    downPaymentPct: parseNum(a.downPaymentPct) / 100,
    interestRate: parseNum(a.interestRate) / 100,
    loanTermYears: parseNum(a.loanTermYears),
    expectedNightlyRate: parseNum(a.expectedNightlyRate),
    occupancyRate: parseNum(a.occupancyRate) / 100,
    avgStayLengthNights: parseNum(a.avgStayLengthNights),
    rehabCost: parseNum(a.rehabCost),
    furnishingCost: parseNum(a.furnishingCost),
    propertyTaxAnnual: parseNum(a.propertyTaxAnnual),
    insuranceAnnual: parseNum(a.insuranceAnnual),
    utilitiesMonthly: parseNum(a.utilitiesMonthly),
    platformFeePct: parseNum(a.platformFeePct) / 100,
    managementFeePct: parseNum(a.managementFeePct) / 100,
    cleaningFeePerStay: parseNum(a.cleaningFeePerStay),
    cleaningCostPerStay: parseNum(a.cleaningCostPerStay),
    maintenancePct: parseNum(a.maintenancePct) / 100,
    selfManaging: a.selfManaging,
  })

  const analyze = async (overrides?: Partial<DealInputs>) => {
    setStatus('analyzing')
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          overrides: overrides ?? toOverrides(assumptions),
          propertyDetails: {
            purchasePrice: parseNum(assumptions.purchasePrice) || undefined,
            beds: parseNum(propertyMeta.beds) || undefined,
            baths: parseNum(propertyMeta.baths) || undefined,
            sqft: parseNum(propertyMeta.sqft) || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setDeal(data)
      setRedisSaved(data.redisSaved !== false)
      setInputs({})
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const rerun = () => {
    if (!deal) return
    const merged: Partial<DealInputs> = {}
    for (const k of Object.keys(deal.inputs) as (keyof DealInputs)[]) {
      if (k in inputs) (merged as Record<string, unknown>)[k] = inputs[k]
    }
    analyze(merged)
  }

  const reset = () => {
    setStatus('idle')
    setDeal(null)
    setError(null)
    setInputs({})
    setAssumptions(DEFAULTS)
    setPropertyMeta({ beds: '', baths: '', sqft: '', zillowLive: false })
    setGeminiLoaded(false)
  }

  const inp = deal ? { ...deal.inputs, ...inputs } : null
  const verdictColor = deal?.analysis.verdict === 'strong' ? 'positive' : deal?.analysis.verdict === 'pass' ? 'negative' : 'warning'

  return (
    <div className="space-y-6">

      {/* ── Step 1: Address ── */}
      {status === 'idle' && (
        <div className="space-y-3">
          <div>
            <h1 className="text-xl font-mono font-bold text-white">STR Deal Analyzer</h1>
            <p className="text-sm font-mono text-[#6b7280] mt-1">Enter an address to load property data and market estimates</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. 42 Atlantic Ave, Wells, ME 04090"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAll()}
              className="flex-1 bg-[#161b27] border border-[#1f2937] rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-[#374151] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
            <button
              onClick={loadAll}
              disabled={!address.trim()}
              className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#1e3a5f] disabled:text-[#374151] text-white font-mono font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {status === 'loading' && (
        <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs font-mono text-[#4b5563]">Fetching property data and market estimates...</p>
        </div>
      )}

      {/* ── Step 2: Assumptions Form ── */}
      {status === 'form' && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <button onClick={reset} className="text-[11px] font-mono text-[#4b5563] hover:text-[#6b7280] transition-colors">← Change address</button>
              <h2 className="text-base font-mono font-bold text-white mt-0.5">{address}</h2>
              {(propertyMeta.beds || propertyMeta.baths || propertyMeta.sqft) && (
                <p className="text-[11px] font-mono text-[#4b5563] mt-0.5">
                  {propertyMeta.beds && `${propertyMeta.beds} bed`}
                  {propertyMeta.baths && ` · ${propertyMeta.baths} bath`}
                  {propertyMeta.sqft && ` · ${Number(propertyMeta.sqft).toLocaleString()} sqft`}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {propertyMeta.zillowLive && <DataBadge source="Zillow" live />}
              {geminiLoaded && <DataBadge source="Gemini AI" live />}
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5 space-y-6">

            {/* Financing */}
            <FormSection title="Financing">
              <FormGrid>
                <FF label="Purchase Price $" value={assumptions.purchasePrice} onChange={(v) => setField('purchasePrice', v)} placeholder="650000" />
                <FF label="Down Payment %" value={assumptions.downPaymentPct} onChange={(v) => setField('downPaymentPct', v)} placeholder="25" />
                <FF label="Interest Rate %" value={assumptions.interestRate} onChange={(v) => setField('interestRate', v)} placeholder="6.90" badge={geminiLoaded ? 'Gemini' : undefined} />
                <FF label="Loan Term (yrs)" value={assumptions.loanTermYears} onChange={(v) => setField('loanTermYears', v)} placeholder="30" />
              </FormGrid>
            </FormSection>

            {/* STR Performance */}
            <FormSection title="STR Performance" badge={geminiLoaded ? 'Gemini AI' : 'Manual'} badgeLive={geminiLoaded}>
              <FormGrid>
                <FF label="Nightly Rate (ADR) $" value={assumptions.expectedNightlyRate} onChange={(v) => setField('expectedNightlyRate', v)} placeholder="185" badge={geminiLoaded ? 'Gemini' : undefined} />
                <FF label="Occupancy %" value={assumptions.occupancyRate} onChange={(v) => setField('occupancyRate', v)} placeholder="52" badge={geminiLoaded ? 'Gemini' : undefined} />
                <FF label="Avg Stay (nights)" value={assumptions.avgStayLengthNights} onChange={(v) => setField('avgStayLengthNights', v)} placeholder="3" />
              </FormGrid>
            </FormSection>

            {/* Costs */}
            <FormSection title="Costs">
              <FormGrid>
                <FF label="Rehab $" value={assumptions.rehabCost} onChange={(v) => setField('rehabCost', v)} placeholder="0" />
                <FF label="Furnishing $" value={assumptions.furnishingCost} onChange={(v) => setField('furnishingCost', v)} placeholder="0" />
                <FF label="Property Tax $/yr" value={assumptions.propertyTaxAnnual} onChange={(v) => setField('propertyTaxAnnual', v)} placeholder="0" />
                <FF label="Insurance $/yr" value={assumptions.insuranceAnnual} onChange={(v) => setField('insuranceAnnual', v)} placeholder="0" />
                <FF label="Utilities $/mo" value={assumptions.utilitiesMonthly} onChange={(v) => setField('utilitiesMonthly', v)} placeholder="0" />
              </FormGrid>
            </FormSection>

            {/* Operations */}
            <FormSection title="Operations">
              <FormGrid>
                <FF label="Platform Fee %" value={assumptions.platformFeePct} onChange={(v) => setField('platformFeePct', v)} placeholder="3" />
                <FF label="Management Fee %" value={assumptions.managementFeePct} onChange={(v) => setField('managementFeePct', v)} placeholder="0" />
                <FF label="Cleaning Fee $/stay" value={assumptions.cleaningFeePerStay} onChange={(v) => setField('cleaningFeePerStay', v)} placeholder="0" />
                <FF label="Cleaning Cost $/stay" value={assumptions.cleaningCostPerStay} onChange={(v) => setField('cleaningCostPerStay', v)} placeholder="0" />
                <FF label="Maintenance %" value={assumptions.maintenancePct} onChange={(v) => setField('maintenancePct', v)} placeholder="5" />
              </FormGrid>
              <label className="flex items-center gap-2 mt-3 cursor-pointer w-fit">
                <div
                  onClick={() => setField('selfManaging', !assumptions.selfManaging)}
                  className={clsx('w-8 h-4 rounded-full transition-colors relative cursor-pointer', assumptions.selfManaging ? 'bg-[#3b82f6]' : 'bg-[#374151]')}
                >
                  <div className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform', assumptions.selfManaging ? 'translate-x-4' : 'translate-x-0.5')} />
                </div>
                <span className="text-xs font-mono text-[#6b7280]">Self-Managing (no management fee)</span>
              </label>
            </FormSection>

            <button
              onClick={() => analyze()}
              className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-mono font-bold text-sm rounded-lg transition-colors"
            >
              Analyze Deal →
            </button>
          </div>
        </div>
      )}

      {/* ── Analyzing ── */}
      {status === 'analyzing' && <PageSkeleton />}

      {/* ── Error ── */}
      {status === 'error' && (
        <div className="space-y-4">
          <button onClick={reset} className="text-[#3b82f6] font-mono text-sm hover:underline">← Start over</button>
          <div className="bg-[#1c0505] border border-[#7f1d1d] rounded-lg p-5">
            <p className="text-[#ef4444] font-mono text-sm font-bold mb-1">Analysis Failed</p>
            <p className="text-[#9ca3af] text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {status === 'done' && deal && inp && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <button onClick={reset} className="text-[11px] font-mono text-[#4b5563] hover:text-[#6b7280] transition-colors">← New Analysis</button>
              <h1 className="text-lg font-mono font-bold text-white mt-1 leading-snug">{deal.address}</h1>
              <p className="text-[11px] font-mono text-[#4b5563] mt-0.5">
                {propertyMeta.beds && `${propertyMeta.beds} bed`}
                {propertyMeta.baths && ` · ${propertyMeta.baths} bath`}
                {propertyMeta.sqft && ` · ${Number(propertyMeta.sqft).toLocaleString()} sqft`}
              </p>
            </div>
          </div>

          {!redisSaved && (
            <div className="text-xs font-mono text-[#f59e0b] bg-[#1c1407] border border-[#92400e] rounded px-3 py-2">
              ⚠ Deal analyzed but not saved (Redis unavailable)
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
            {/* Left: Adjustments */}
            <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-widest text-[#6b7280]">Adjust & Re-run</h2>
                <button onClick={rerun} className="text-[11px] font-mono px-3 py-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded transition-colors">
                  Re-run
                </button>
              </div>
              <AdjustSection title="Financing">
                <AF label="Purchase Price" value={inp.purchasePrice} onChange={(v) => setInput('purchasePrice', v)} />
                <AF label="Down Payment %" value={inp.downPaymentPct * 100} onChange={(v) => setInput('downPaymentPct', String(parseNum(v) / 100))} step="1" />
                <AF label="Interest Rate %" value={(inp.interestRate * 100).toFixed(2)} onChange={(v) => setInput('interestRate', String(parseNum(v) / 100))} step="0.01" />
                <AF label="Loan Term (yrs)" value={inp.loanTermYears} onChange={(v) => setInput('loanTermYears', v)} step="1" />
              </AdjustSection>
              <AdjustSection title="STR Performance">
                <AF label="Nightly Rate $" value={inp.expectedNightlyRate} onChange={(v) => setInput('expectedNightlyRate', v)} />
                <AF label="Occupancy %" value={(inp.occupancyRate * 100).toFixed(0)} onChange={(v) => setInput('occupancyRate', String(parseNum(v) / 100))} step="1" />
                <AF label="Avg Stay (nights)" value={inp.avgStayLengthNights} onChange={(v) => setInput('avgStayLengthNights', v)} step="0.5" />
              </AdjustSection>
              <AdjustSection title="Costs">
                <AF label="Rehab $" value={inp.rehabCost} onChange={(v) => setInput('rehabCost', v)} />
                <AF label="Furnishing $" value={inp.furnishingCost} onChange={(v) => setInput('furnishingCost', v)} />
                <AF label="Property Tax $/yr" value={inp.propertyTaxAnnual} onChange={(v) => setInput('propertyTaxAnnual', v)} />
                <AF label="Insurance $/yr" value={inp.insuranceAnnual} onChange={(v) => setInput('insuranceAnnual', v)} />
                <AF label="Utilities $/mo" value={inp.utilitiesMonthly} onChange={(v) => setInput('utilitiesMonthly', v)} />
              </AdjustSection>
              <AdjustSection title="Operations">
                <AF label="Platform Fee %" value={(inp.platformFeePct * 100).toFixed(0)} onChange={(v) => setInput('platformFeePct', String(parseNum(v) / 100))} step="0.5" />
                <AF label="Mgmt Fee %" value={(inp.managementFeePct * 100).toFixed(0)} onChange={(v) => setInput('managementFeePct', String(parseNum(v) / 100))} step="1" />
                <AF label="Cleaning Fee $" value={inp.cleaningFeePerStay} onChange={(v) => setInput('cleaningFeePerStay', v)} />
                <AF label="Cleaning Cost $" value={inp.cleaningCostPerStay} onChange={(v) => setInput('cleaningCostPerStay', v)} />
                <AF label="Maintenance %" value={(inp.maintenancePct * 100).toFixed(0)} onChange={(v) => setInput('maintenancePct', String(parseNum(v) / 100))} step="1" />
              </AdjustSection>
            </div>

            {/* Right: Results */}
            <div className="space-y-5">
              <PropertyImageCard image={deal.fetched.propertyImage} address={deal.address} />
              <VerdictBanner verdict={deal.analysis.verdict} verdictReason={deal.analysis.verdictReason} aiSummary={deal.aiSummary} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard label="Monthly Cash Flow" value={formatCurrency(deal.analysis.monthlyCashFlow)} sub="after all expenses" variant={verdictColor as 'positive' | 'negative' | 'warning'} large />
                <MetricCard label="Cash-on-Cash Return" value={formatPercent(deal.analysis.cashOnCashReturn)} sub={`on ${formatCurrency(deal.analysis.totalCashInvested)} invested`} variant={deal.analysis.cashOnCashReturn > 0.08 ? 'positive' : deal.analysis.cashOnCashReturn > 0.04 ? 'warning' : 'negative'} />
                <MetricCard label="Cap Rate" value={formatPercent(deal.analysis.capRate)} sub="NOI / purchase price" variant={deal.analysis.capRate > 0.06 ? 'positive' : deal.analysis.capRate > 0.04 ? 'warning' : 'negative'} />
                <MetricCard label="RevPAR" value={`$${Math.round(deal.analysis.revPAR)}`} sub="nightly rate × occupancy" variant="blue" />
                <MetricCard label="Break-even Occ." value={formatPercent(deal.analysis.breakEvenOccupancy)} sub={`need ${formatPercent(deal.analysis.breakEvenOccupancy)} to break even`} variant={deal.analysis.breakEvenOccupancy < 0.55 ? 'positive' : deal.analysis.breakEvenOccupancy < 0.75 ? 'warning' : 'negative'} />
                <MetricCard label="Gross Yield" value={formatPercent(deal.analysis.grossYield)} sub="gross rev / price" variant="blue" />
              </div>

              {deal.aiSummary ? <AIFlagsCard summary={deal.aiSummary} /> : (
                <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
                  <p className="text-xs font-mono text-[#4b5563]">AI summary unavailable — set GEMINI_API_KEY to enable.</p>
                </div>
              )}

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

              <ProjectionChart projections={deal.analysis.projections} />

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

              <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-4">
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-[#4b5563] mb-3">Data Sources</h3>
                <div className="flex flex-wrap gap-2">
                  <DataBadge source={deal.fetched.rabbu.source === 'gemini' ? 'Gemini AI' : 'Estimated'} live={deal.fetched.rabbu.source === 'gemini'} />
                  <DataBadge source="Zillow" live={deal.fetched.zillow?.source === 'live'} />
                </div>
                <p className="text-[10px] font-mono text-[#374151] mt-2">Analyzed: {new Date(deal.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Form Step Components ──────────────────────────────────────────

function FormSection({ title, children, badge, badgeLive }: { title: string; children: React.ReactNode; badge?: string; badgeLive?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#6b7280]">{title}</p>
        {badge && <DataBadge source={badge} live={badgeLive} />}
      </div>
      {children}
    </div>
  )
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function FF({ label, value, onChange, placeholder, badge }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; badge?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-mono text-[#4b5563]">{label}</label>
        {badge && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0f1117] text-[#3b82f6] border border-[#1e3a5f]">{badge}</span>}
      </div>
      <input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#1f2937] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-[#374151] focus:outline-none focus:border-[#3b82f6] transition-colors"
      />
    </div>
  )
}

// ── Results Adjustment Components ─────────────────────────────────

function AdjustSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono uppercase tracking-widest text-[#374151]">{title}</p>
      {children}
    </div>
  )
}

function AF({ label, value, onChange, step }: { label: string; value: string | number; onChange: (v: string) => void; step?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-mono text-[#6b7280] shrink-0">{label}</span>
      <input
        type="number"
        step={step ?? 'any'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 bg-[#0f1117] border border-[#1f2937] rounded px-2 py-1 text-xs font-mono text-white text-right focus:outline-none focus:border-[#3b82f6] transition-colors"
      />
    </div>
  )
}

// ── Shared Result Components ───────────────────────────────────────

function Row({ label, value, bold = false, neg = false }: { label: string; value: number; bold?: boolean; neg?: boolean }) {
  return (
    <div className={clsx('flex justify-between text-xs font-mono', bold && 'border-t border-[#1f2937] pt-2 mt-1')}>
      <span className={bold ? 'text-white font-bold' : 'text-[#6b7280]'}>{label}</span>
      <span className={clsx(bold ? 'font-bold' : '', neg ? 'text-[#ef4444]' : 'text-[#22c55e]')}>{formatCurrency(value)}</span>
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
