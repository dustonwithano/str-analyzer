import { GoogleGenerativeAI } from '@google/generative-ai'
import type { FullDeal, AISummary, STRMarketEstimate } from './types'

const MARKET_FALLBACK: STRMarketEstimate = {
  city: '',
  state: '',
  adr: 185,
  occupancyRate: 0.58,
  revPAR: 107,
  marketADR: 185,
  marketOccupancy: 0.58,
  marketRevPAR: 107,
  estimatedPurchasePrice: 550000,
  propertyTaxRate: 0.012,
  mortgageRate: 0.069,
  marketType: 'unknown',
  seasonalityNote: 'Seasonality data unavailable.',
  confidenceLevel: 'low',
}

export interface PropertyContext {
  purchasePrice?: number
  beds?: number
  baths?: number
  sqft?: number
}

export async function estimateSTRMarket(address: string, property?: PropertyContext): Promise<STRMarketEstimate> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return MARKET_FALLBACK

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const propertyLines = property ? [
      property.beds != null ? `- Bedrooms: ${property.beds}` : null,
      property.baths != null ? `- Bathrooms: ${property.baths}` : null,
      property.sqft != null ? `- Square footage: ${property.sqft.toLocaleString()} sqft` : null,
      property.purchasePrice != null ? `- Purchase price: $${property.purchasePrice.toLocaleString()}` : null,
    ].filter(Boolean).join('\n') : null

    const prompt = `You are a conservative short-term rental underwriter. Your job is to produce realistic, defensible STR estimates that protect investors from overpaying — not to make deals look attractive. Err on the side of caution. Return ONLY valid JSON — no markdown, no backticks, no extra text.

ADDRESS: ${address}
${propertyLines ? `\nPROPERTY DETAILS:\n${propertyLines}\n` : ''}

CRITICAL RULES:
- All estimates must reflect ANNUAL AVERAGES weighted across all 365 nights, including slow weekdays, off-season months, and shoulder periods. Do NOT use peak season or weekend rates as your estimate.
- occupancyRate is what a NEW, median-performing listing achieves in year 1 — not an established top performer. Most STRs do not exceed 60% annual occupancy.
- adr is the average nightly rate across all BOOKED nights for a median listing, not the listing price or what top properties charge.
- marketADR and marketOccupancy are the 50th percentile of active listings in this market — the true baseline, not aspirational.

REALISTIC OCCUPANCY RANGES BY MARKET TYPE (use these as your upper bounds):
- Coastal beach (seasonal): 48–60% annual avg
- Urban/city: 52–62% annual avg
- Ski/mountain (seasonal): 42–55% annual avg
- Lake house (seasonal): 45–58% annual avg
- Desert resort (e.g. Palm Springs, Scottsdale): 50–60% annual avg
- Rural/cabin: 38–52% annual avg
- Suburban/generic: 40–52% annual avg

INSTRUCTIONS:
- adr: median nightly rate for a booked night for this property type and size in this market
- occupancyRate: realistic annual occupancy decimal (e.g. 0.52 for 52%) — stay within the ranges above
- revPAR: adr × occupancyRate
- marketADR/marketOccupancy/marketRevPAR: 50th percentile benchmarks for all active STRs in this market
- estimatedPurchasePrice: realistic purchase price for an STR-viable property matching the provided details in this market
- propertyTaxRate: estimated annual property tax as decimal of assessed value (e.g. 0.012 for 1.2%)
- mortgageRate: current approximate 30-year fixed mortgage rate as decimal (e.g. 0.069)
- marketType: one of "coastal beach", "urban", "ski/mountain", "lake house", "desert resort", "rural/cabin", "suburban"
- seasonalityNote: one sentence on peak vs off-season — include how many months are low season
- confidenceLevel: "high" if well-known STR market with clear data, "medium" if limited info, "low" if very little data

Return exactly this JSON:
{
  "city": "string",
  "state": "string (2-letter abbreviation)",
  "adr": number,
  "occupancyRate": number,
  "revPAR": number,
  "marketADR": number,
  "marketOccupancy": number,
  "marketRevPAR": number,
  "estimatedPurchasePrice": number,
  "propertyTaxRate": number,
  "mortgageRate": number,
  "marketType": "string",
  "seasonalityNote": "string",
  "confidenceLevel": "high|medium|low"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const p = JSON.parse(clean)

    return {
      city: p.city ?? '',
      state: p.state ?? '',
      adr: p.adr ?? MARKET_FALLBACK.adr,
      occupancyRate: p.occupancyRate ?? MARKET_FALLBACK.occupancyRate,
      revPAR: p.revPAR ?? (p.adr != null && p.occupancyRate != null ? p.adr * p.occupancyRate : MARKET_FALLBACK.revPAR),
      marketADR: p.marketADR ?? p.adr ?? MARKET_FALLBACK.marketADR,
      marketOccupancy: p.marketOccupancy ?? p.occupancyRate ?? MARKET_FALLBACK.marketOccupancy,
      marketRevPAR: p.marketRevPAR ?? MARKET_FALLBACK.marketRevPAR,
      estimatedPurchasePrice: p.estimatedPurchasePrice ?? MARKET_FALLBACK.estimatedPurchasePrice,
      propertyTaxRate: p.propertyTaxRate ?? MARKET_FALLBACK.propertyTaxRate,
      mortgageRate: p.mortgageRate ?? MARKET_FALLBACK.mortgageRate,
      marketType: p.marketType ?? MARKET_FALLBACK.marketType,
      seasonalityNote: p.seasonalityNote ?? MARKET_FALLBACK.seasonalityNote,
      confidenceLevel: ['high', 'medium', 'low'].includes(p.confidenceLevel)
        ? p.confidenceLevel
        : 'low',
    }
  } catch {
    return MARKET_FALLBACK
  }
}

const FALLBACK: AISummary = {
  headline: 'Analysis complete — AI summary unavailable',
  summary:
    'The financial model has been calculated from the provided inputs. Review the metrics below for a complete picture of this deal.',
  greenFlags: [],
  redFlags: [],
  strategyRecommendation: 'negotiate',
  sensitivityNote: 'Review the break-even occupancy metric to assess downside risk.',
  confidenceLevel: 'low',
  confidenceReason: 'AI summary unavailable — model ran without Gemini.',
}

export async function generateDealSummary(deal: FullDeal): Promise<AISummary> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return FALLBACK

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const { analysis, inputs, fetched } = deal
    const cocPct = (analysis.cashOnCashReturn * 100).toFixed(1)
    const capPct = (analysis.capRate * 100).toFixed(1)
    const bePct = (analysis.breakEvenOccupancy * 100).toFixed(1)
    const occPct = (inputs.occupancyRate * 100).toFixed(0)
    const mktOccPct = (fetched.rabbu.marketOccupancy * 100).toFixed(0)

    const prompt = `You are an expert short-term rental investment analyst. Analyze this deal and return ONLY valid JSON — no markdown, no backticks, no extra text.

PROPERTY: ${deal.address}
VERDICT: ${analysis.verdict.toUpperCase()}

FINANCIAL SNAPSHOT:
- Purchase Price: $${inputs.purchasePrice.toLocaleString()}
- Total Cash In: $${Math.round(analysis.totalCashInvested).toLocaleString()} (${(inputs.downPaymentPct * 100).toFixed(0)}% down + rehab/furnishing)
- Monthly Cash Flow: $${Math.round(analysis.monthlyCashFlow).toLocaleString()}
- Annual Cash Flow: $${Math.round(analysis.annualCashFlow).toLocaleString()}
- Cash-on-Cash Return: ${cocPct}%
- Cap Rate: ${capPct}%
- Gross Yield: ${(analysis.grossYield * 100).toFixed(1)}%
- DSCR: ${analysis.dscr.toFixed(2)}
- Break-even Occupancy: ${bePct}%
- RevPAR: $${analysis.revPAR.toFixed(0)}
- GRM: ${analysis.grm.toFixed(1)}x

STR MARKET (${fetched.rabbu.source === 'gemini' ? 'Gemini AI estimate' : 'estimated defaults'}):
- This deal ADR: $${inputs.expectedNightlyRate} vs Market ADR: $${fetched.rabbu.marketADR}
- This deal occupancy: ${occPct}% vs Market: ${mktOccPct}%
- Deal assumptions vs market: ${inputs.expectedNightlyRate > fetched.rabbu.marketADR ? 'ABOVE market ADR (optimistic)' : 'at or below market ADR (conservative)'}

INTEREST RATE: ${(inputs.interestRate * 100).toFixed(2)}% (estimated)

Return exactly this JSON shape:
{
  "headline": "One punchy sentence verdict — be specific about the numbers",
  "summary": "3-4 sentences covering cash flow, returns, occupancy sensitivity, and market context",
  "greenFlags": ["2-3 specific positives about this deal"],
  "redFlags": ["2-3 specific risks or concerns"],
  "strategyRecommendation": "buy or negotiate or pass",
  "sensitivityNote": "One sentence: what happens to cash flow if occupancy drops 10 points?",
  "confidenceLevel": "high or medium or low",
  "confidenceReason": "Brief explanation of data quality and confidence drivers"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(clean)

    return {
      headline: parsed.headline ?? FALLBACK.headline,
      summary: parsed.summary ?? FALLBACK.summary,
      greenFlags: Array.isArray(parsed.greenFlags) ? parsed.greenFlags.slice(0, 3) : [],
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 3) : [],
      strategyRecommendation: ['buy', 'negotiate', 'pass'].includes(parsed.strategyRecommendation)
        ? parsed.strategyRecommendation
        : 'negotiate',
      sensitivityNote: parsed.sensitivityNote ?? '',
      confidenceLevel: ['high', 'medium', 'low'].includes(parsed.confidenceLevel)
        ? parsed.confidenceLevel
        : 'low',
      confidenceReason: parsed.confidenceReason ?? '',
    }
  } catch {
    return FALLBACK
  }
}
