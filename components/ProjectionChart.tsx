'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { YearProjection } from '@/lib/types'

function formatK(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1117] border border-[#1f2937] rounded-lg p-3 text-xs font-mono">
      <p className="text-[#6b7280] mb-2 uppercase tracking-wider">Year {label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="mb-0.5">
          {item.name}:{' '}
          <span className="font-bold">
            {item.value < 0 ? `(${formatK(Math.abs(item.value))})` : formatK(item.value)}
          </span>
        </p>
      ))}
    </div>
  )
}

export function ProjectionChart({ projections }: { projections: YearProjection[] }) {
  return (
    <div className="bg-[#161b27] border border-[#1f2937] rounded-lg p-5">
      <h3 className="text-xs font-mono uppercase tracking-widest text-[#6b7280] mb-4">
        10-Year Projection
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={projections} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#4b5563', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#4b5563', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cashFlow"
            name="Cash Flow"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
