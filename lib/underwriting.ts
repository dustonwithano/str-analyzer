import type { DealInputs, DealAnalysis, DealExpenses, YearProjection } from './types'

export function runUnderwriting(inputs: DealInputs): DealAnalysis {
  const {
    purchasePrice,
    downPaymentPct,
    loanTermYears,
    interestRate,
    rehabCost,
    furnishingCost,
    expectedNightlyRate,
    occupancyRate,
    managementFeePct,
    cleaningFeePerStay,
    cleaningCostPerStay,
    avgStayLengthNights,
    propertyTaxAnnual,
    insuranceAnnual,
    platformFeePct,
    maintenancePct,
    utilitiesMonthly,
    selfManaging,
  } = inputs

  // ── Financing ─────────────────────────────────────────────────────────────
  const loanAmount = purchasePrice * (1 - downPaymentPct)
  const downPayment = purchasePrice * downPaymentPct
  const totalCashInvested = downPayment + rehabCost + furnishingCost

  const monthlyRate = interestRate / 12
  const numPayments = loanTermYears * 12
  const monthlyMortgage =
    loanAmount > 0 && monthlyRate > 0
      ? (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0

  // ── Revenue ───────────────────────────────────────────────────────────────
  const effectiveOccupiedNights = occupancyRate * 365
  const grossAnnualRevenue = expectedNightlyRate * effectiveOccupiedNights
  const numberOfStays = effectiveOccupiedNights / avgStayLengthNights
  const cleaningRevenue = cleaningFeePerStay * numberOfStays
  const totalGrossIncome = grossAnnualRevenue + cleaningRevenue

  // ── Expenses (annual) ─────────────────────────────────────────────────────
  const annualMortgage = monthlyMortgage * 12
  const platformFees = platformFeePct * grossAnnualRevenue
  const managementFees = selfManaging ? 0 : managementFeePct * totalGrossIncome
  const cleaningCosts = cleaningCostPerStay * numberOfStays
  const maintenance = maintenancePct * grossAnnualRevenue
  const utilities = utilitiesMonthly * 12

  const expenses: DealExpenses = {
    mortgage: annualMortgage,
    propertyTax: propertyTaxAnnual,
    insurance: insuranceAnnual,
    platformFees,
    managementFees,
    cleaningCosts,
    maintenance,
    utilities,
    total:
      annualMortgage +
      propertyTaxAnnual +
      insuranceAnnual +
      platformFees +
      managementFees +
      cleaningCosts +
      maintenance +
      utilities,
  }

  // ── Key Metrics ───────────────────────────────────────────────────────────
  const operatingExpenses =
    propertyTaxAnnual + insuranceAnnual + platformFees + managementFees + cleaningCosts + maintenance + utilities

  const noi = totalGrossIncome - operatingExpenses
  const annualCashFlow = noi - annualMortgage
  const monthlyCashFlow = annualCashFlow / 12

  const capRate = noi / purchasePrice
  const cashOnCashReturn = totalCashInvested > 0 ? annualCashFlow / totalCashInvested : 0
  const grm = grossAnnualRevenue > 0 ? purchasePrice / grossAnnualRevenue : 0
  const revPAR = expectedNightlyRate * occupancyRate
  const dscr = annualMortgage > 0 ? noi / annualMortgage : 0
  const grossYield = grossAnnualRevenue / purchasePrice

  // Break-even occupancy (algebraic solve)
  const revenuePerUnit = expectedNightlyRate * 365 + cleaningFeePerStay * (365 / avgStayLengthNights)
  const varExpPerUnit =
    platformFeePct * expectedNightlyRate * 365 +
    (selfManaging ? 0 : managementFeePct * revenuePerUnit) +
    cleaningCostPerStay * (365 / avgStayLengthNights) +
    maintenancePct * expectedNightlyRate * 365
  const fixedExp = annualMortgage + propertyTaxAnnual + insuranceAnnual + utilities
  const netPerUnit = revenuePerUnit - varExpPerUnit
  const breakEvenOccupancy = netPerUnit > 0 ? Math.min(1, fixedExp / netPerUnit) : 1

  // ── 10-Year Projections ───────────────────────────────────────────────────
  const projections: YearProjection[] = []
  let remainingBalance = loanAmount

  for (let year = 1; year <= 10; year++) {
    const revGrowth = Math.pow(1.03, year - 1)
    const expGrowth = Math.pow(1.02, year - 1)
    const appFactor = Math.pow(1.03, year)

    const yearRevenue = totalGrossIncome * revGrowth
    const yearOpEx = operatingExpenses * expGrowth
    const yearCashFlow = yearRevenue - yearOpEx - annualMortgage
    const propertyValue = purchasePrice * appFactor

    // Track principal paydown over this year
    for (let m = 0; m < 12; m++) {
      const interest = remainingBalance * monthlyRate
      const principal = monthlyMortgage - interest
      remainingBalance = Math.max(0, remainingBalance - principal)
    }

    projections.push({
      year,
      revenue: Math.round(yearRevenue),
      expenses: Math.round(yearOpEx + annualMortgage),
      cashFlow: Math.round(yearCashFlow),
      equity: Math.round(propertyValue - remainingBalance),
      propertyValue: Math.round(propertyValue),
    })
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const cocPct = cashOnCashReturn * 100
  const capPct = capRate * 100

  let verdict: 'strong' | 'marginal' | 'pass'
  let verdictReason: string

  if (annualCashFlow < 0) {
    verdict = 'pass'
    verdictReason = `Negative cash flow of ${fmt(annualCashFlow)}/yr — deal does not pencil at current assumptions.`
  } else if (cocPct < 4) {
    verdict = 'pass'
    verdictReason = `Cash-on-cash return of ${cocPct.toFixed(1)}% is below the 4% minimum threshold.`
  } else if (cocPct > 8 && capPct > 6) {
    verdict = 'strong'
    verdictReason = `Strong deal: ${cocPct.toFixed(1)}% CoC return and ${capPct.toFixed(1)}% cap rate both exceed targets.`
  } else {
    verdict = 'marginal'
    verdictReason = `Marginal: ${cocPct.toFixed(1)}% CoC / ${capPct.toFixed(1)}% cap — meets minimums but leaves little margin for error.`
  }

  return {
    loanAmount,
    totalCashInvested,
    monthlyMortgage,
    grossAnnualRevenue,
    effectiveOccupiedNights,
    cleaningRevenue,
    totalGrossIncome,
    expenses,
    noi,
    annualCashFlow,
    monthlyCashFlow,
    capRate,
    cashOnCashReturn,
    grm,
    revPAR,
    dscr,
    breakEvenOccupancy,
    grossYield,
    projections,
    verdict,
    verdictReason,
  }
}

function fmt(n: number): string {
  if (n < 0) return `($${Math.round(Math.abs(n)).toLocaleString()})`
  return `$${Math.round(n).toLocaleString()}`
}
