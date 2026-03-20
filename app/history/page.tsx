'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DealTable } from '@/components/DealTable'
import type { DealSummary } from '@/lib/types'

export default function HistoryPage() {
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deals')
      if (!res.ok) throw new Error(`Failed to load deals: ${res.status}`)
      const data = await res.json()
      setDeals(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deal?')) return
    try {
      await fetch(`/api/deals/${id}`, { method: 'DELETE' })
      setDeals((prev) => prev.filter((d) => d.id !== id))
    } catch {
      alert('Failed to delete deal')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-white">Deal History</h1>
          <p className="text-sm font-mono text-[#6b7280] mt-1">{deals.length} deal{deals.length !== 1 ? 's' : ''} analyzed</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-mono text-xs rounded-lg transition-colors"
        >
          + New Analysis
        </Link>
      </div>

      {loading && (
        <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-8 text-center">
          <div className="h-4 bg-[#1f2937] rounded animate-pulse w-1/3 mx-auto" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-[#1c0505] border border-[#7f1d1d] rounded-lg p-5">
          <p className="text-[#ef4444] font-mono text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && deals.length === 0 && (
        <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-12 text-center">
          <p className="text-3xl mb-3">🏘</p>
          <p className="font-mono font-bold text-white mb-2">No deals analyzed yet</p>
          <p className="text-sm font-mono text-[#4b5563] mb-4">
            Run your first analysis to see deals here.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-mono text-xs rounded-lg transition-colors"
          >
            Run your first analysis →
          </Link>
        </div>
      )}

      {!loading && !error && deals.length > 0 && (
        <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
          <DealTable deals={deals} onDelete={handleDelete} />
        </div>
      )}
    </div>
  )
}
