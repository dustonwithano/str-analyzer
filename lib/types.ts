export interface DealInputs {
  purchasePrice: number
  downPaymentPct: number
  loanTermYears: number
  interestRate: number
  rehabCost: number
  furnishingCost: number
  expectedNightlyRate: number
  occupancyRate: number
  managementFeePct: number
  cleaningFeePerStay: number
  cleaningCostPerStay: number
  avgStayLengthNights: number
  propertyTaxAnnual: number
  insuranceAnnual: number
  platformFeePct: number
  maintenancePct: number
  utilitiesMonthly: number
  selfManaging: boolean
}

export interface YearProjection {
  year: number
  revenue: number
  expenses: number
  cashFlow: number
  equity: number
  propertyValue: number
}

export interface DealExpenses {
  mortgage: number
  propertyTax: number
  insurance: number
  platformFees: number
  managementFees: number
  cleaningCosts: number
  maintenance: number
  utilities: number
  total: number
}

export interface DealAnalysis {
  loanAmount: number
  totalCashInvested: number
  monthlyMortgage: number
  grossAnnualRevenue: number
  effectiveOccupiedNights: number
  cleaningRevenue: number
  totalGrossIncome: number
  expenses: DealExpenses
  noi: number
  annualCashFlow: number
  monthlyCashFlow: number
  capRate: number
  cashOnCashReturn: number
  grm: number
  revPAR: number
  dscr: number
  breakEvenOccupancy: number
  grossYield: number
  projections: YearProjection[]
  verdict: 'strong' | 'marginal' | 'pass'
  verdictReason: string
}

export interface AISummary {
  headline: string
  summary: string
  greenFlags: string[]
  redFlags: string[]
  strategyRecommendation: 'buy' | 'negotiate' | 'pass'
  sensitivityNote: string
  confidenceLevel: 'high' | 'medium' | 'low'
  confidenceReason: string
}

export interface ZillowData {
  listPrice: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
  propertyTaxAnnual: number | null
  zestimate: number | null
  zpid: string | null
  imgSrc: string | null
  priceHistory: Array<{ date: string; price: number }> | null
  source: 'live' | 'failed'
}

export interface RentcastData {
  rentEstimate: number | null
  medianRent: number | null
  vacancyRate: number | null
  source: 'live' | 'failed'
}

export interface RabbuData {
  adr: number
  occupancyRate: number
  revPAR: number
  marketADR: number
  marketOccupancy: number
  marketRevPAR: number
  isMockData: boolean
  source: 'live' | 'mock' | 'failed'
}

export interface FredData {
  rate: number | null
  date: string | null
  source: 'live' | 'failed'
}

export interface LocationScore {
  overall: number
  breakdown: {
    restaurants: number
    attractions: number
    beach: number
    transit: number
    airport: number
  }
  isMockData: boolean
  source: 'live' | 'mock' | 'failed'
}

export interface PropertyImage {
  url: string | null
  source: 'zillow' | 'streetview' | 'places' | 'placeholder'
  isFallback: boolean
}

export interface GeocodedAddress {
  formattedAddress: string
  lat: number
  lng: number
  zipCode: string
  city: string
  state: string
  placeId: string | null
  source: 'live' | 'failed'
}

export interface FetchedData {
  geocoded: GeocodedAddress | null
  zillow: ZillowData | null
  rentcast: RentcastData | null
  rabbu: RabbuData
  fred: FredData | null
  location: LocationScore | null
  propertyImage: PropertyImage
}

export interface FullDeal {
  id: string
  address: string
  createdAt: string
  inputs: DealInputs
  fetched: FetchedData
  analysis: DealAnalysis
  aiSummary: AISummary | null
  isMockData: boolean
}

export interface DealSummary {
  id: string
  address: string
  createdAt: string
  purchasePrice: number
  monthlyCashFlow: number
  cashOnCashReturn: number
  capRate: number
  verdict: 'strong' | 'marginal' | 'pass'
  propertyImage?: PropertyImage
}
