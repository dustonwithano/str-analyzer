import { GoogleGenerativeAI } from '@google/generative-ai'
import type { FullDeal, AISummary } from './types'

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

STR MARKET (${fetched.rabbu.isMockData ? 'estimated — Wells, ME 04090' : 'live data'}):
- This deal ADR: $${inputs.expectedNightlyRate} vs Market ADR: $${fetched.rabbu.marketADR}
- This deal occupancy: ${occPct}% vs Market: ${mktOccPct}%
- Deal assumptions vs market: ${inputs.expectedNightlyRate > fetched.rabbu.marketADR ? 'ABOVE market ADR (optimistic)' : 'at or below market ADR (conservative)'}

LOCATION SCORE: ${fetched.location?.overall ?? 'N/A'}/10
INTEREST RATE: ${(inputs.interestRate * 100).toFixed(2)}% (${fetched.fred?.source === 'live' ? 'live FRED data' : 'estimated'})

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
