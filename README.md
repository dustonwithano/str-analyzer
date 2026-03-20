# STR Analyzer

A full-stack short-term rental deal analyzer built with Next.js. Enter a property address and get a comprehensive underwriting report with AI-powered deal summary.

## Features

- **Financial underwriting** — mortgage P&I, NOI, cap rate, cash-on-cash, RevPAR, DSCR, break-even occupancy, GRM
- **10-year projections** — rent growth, appreciation, principal paydown
- **Market context** — compare your assumptions vs. market ADR/occupancy/RevPAR
- **AI deal summary** — Gemini-powered green/red flags and strategy recommendation
- **Location score** — STR suitability based on nearby amenities
- **Property image** — Zillow photo → Street View → Places fallback chain
- **Deal history** — all analyses saved to Upstash Redis, viewable/deletable
- **Re-analyze** — update any assumption and re-run with current FRED mortgage rates

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Source |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Yes | [upstash.com](https://upstash.com) → Redis → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | [upstash.com](https://upstash.com) → Redis → REST Token |
| `GEMINI_API_KEY` | Recommended | [aistudio.google.com](https://aistudio.google.com) |
| `ZILLOW_RAPIDAPI_KEY` | Optional | RapidAPI → Zillow56 |
| `RENTCAST_API_KEY` | Optional | [rentcast.io](https://rentcast.io) |
| `RABBU_API_KEY` | Optional | [rabbu.com](https://rabbu.com) — STR market data |
| `FRED_API_KEY` | Optional | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) |
| `GOOGLE_MAPS_API_KEY` | Optional | Google Cloud Console (Maps + Places APIs) |

**Minimum to run:** Only `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are strictly required. All other APIs gracefully fall back to mock/estimated data. Without `GEMINI_API_KEY` the AI summary section is hidden.

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. Enter a property address and click **Analyze Deal**
2. The API pipeline runs in parallel:
   - Geocodes the address
   - Fetches Zillow listing data (purchase price, tax, image)
   - Fetches Rentcast rental comps
   - Fetches Rabbu STR market metrics (ADR, occupancy, RevPAR)
   - Fetches current 30-yr mortgage rate from FRED
   - Scores the location via Google Places
3. Financial model runs underwriting with all fetched data as defaults
4. Gemini analyzes the deal and returns structured flags + recommendations
5. Results saved to Redis; viewable later in **Deal History**

## Pages

- `/` — Main analyzer with editable inputs and full results
- `/history` — All past analyses in a sortable table
- `/deals/[slug]` — Read-only view of any saved deal with re-analyze option

## Tech stack

- **Next.js 16** (App Router)
- **Upstash Redis** — serverless deal storage
- **Google Gemini 2.0 Flash** — AI summaries
- **Recharts** — 10-year projection chart
- **Tailwind CSS v4** — dark terminal aesthetic
- **date-fns**, **clsx**, **lucide-react**
