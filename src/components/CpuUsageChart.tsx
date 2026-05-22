import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { NodeItem, NodeMetricSample } from '../data/mock'
import { useI18n } from '../i18n/I18nContext'

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getChartData(history: NodeMetricSample[] | undefined, currentCpu: number) {
  const source = history ?? []

  if (source.length === 0) {
    const now = Date.now()

    return [
      {
        timestamp: now,
        value: currentCpu,
      },
    ]
  }

  return source.slice(-180).map((item) => ({
    timestamp: item.timestamp,
    value: item.cpu,
  }))
}

export function CpuUsageChart({ node }: { node: NodeItem }) {
  const { t } = useI18n()

  const chartData = useMemo(() => {
    return getChartData(node.history, node.cpu)
  }, [node.history, node.cpu])

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-5 lg:p-6">
      <div className="mb-5">
        <p className="text-sm text-zinc-400">{t.cpuUsage}</p>

        <div className="mt-2">
          <p className="text-5xl font-bold tracking-tight text-emerald-400 sm:text-6xl">
            {node.cpu.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="h-[280px] rounded-2xl bg-black/25 p-3 sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`cpuGradient-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
              tick={{ fill: '#71717a', fontSize: 12 }}
              tickFormatter={(value) => formatTime(Number(value))}
            />

            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />

            <Tooltip
              cursor={{
                stroke: 'rgba(255,255,255,0.35)',
                strokeWidth: 1,
              }}
              contentStyle={{
                background: 'rgba(24,24,27,0.92)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                color: '#fff',
              }}
              labelFormatter={(value) => formatTime(Number(value))}
              formatter={(value) => [`${Number(value).toFixed(2)}%`, t.cpu]}
            />

            <Area
              type="monotone"
              dataKey="value"
              name={t.cpu}
              stroke="#22c55e"
              strokeWidth={3}
              fill={`url(#cpuGradient-${node.id})`}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 0,
              }}
              connectNulls
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
