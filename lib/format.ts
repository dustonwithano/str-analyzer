export function formatCurrency(n: number): string {
  if (n < 0) return `($${Math.round(Math.abs(n)).toLocaleString()})`
  return `$${Math.round(n).toLocaleString()}`
}

export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`
}

export function formatMultiple(n: number): string {
  return `${n.toFixed(1)}x`
}

export function formatNightly(n: number): string {
  return `$${Math.round(n)}/night`
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
