import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { NodeItem, NodeMetricSample } from '../data/mock'
import { useI18n } from '../i18n/I18nContext'
import { formatBytes, formatSpeed } from '../utils/format'

type RangeKey = 'realtime' | '4h' | '1d' | '7d' | '30d'

type ChartPoint = {
  timestamp: number
  cpu: number
  memory: number
  disk: number
  uploadSpeed: number
  downloadSpeed: number
  connections: number
  udpConnections: number
  processes: number
}

type LoadMetricsPanelProps = {
  node: NodeItem
}

const RANGE_HOURS: Record<RangeKey, number> = {
  realtime: 0,
  '4h': 4,
  '1d': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

function getText(lang: string) {
  if (lang === 'en') {
    return {
      realtime: 'Realtime',
      fourHours: '4 hours',
      oneDay: '1 day',
      sevenDays: '7 days',
      thirtyDays: '30 days',
      cpu: 'CPU',
      ram: 'Ram',
      disk: 'Disk',
      network: 'Network',
      connections: 'Connections',
      processes: 'Processes',
      tcp: 'TCP',
      udp: 'UDP',
      upload: 'Upload',
      download: 'Download',
      noData: 'No data',
    }
  }

  if (lang === 'zh-TW') {
    return {
      realtime: '即時',
      fourHours: '4 小時',
      oneDay: '1 天',
      sevenDays: '7 天',
      thirtyDays: '30 天',
      cpu: 'CPU',
      ram: 'Ram',
      disk: 'Disk',
      network: '網路',
      connections: '連接數',
      processes: '進程數',
      tcp: 'TCP',
      udp: 'UDP',
      upload: '上行',
      download: '下行',
      noData: '無',
    }
  }

  return {
    realtime: '实时',
    fourHours: '4 小时',
    oneDay: '1 天',
    sevenDays: '7 天',
    thirtyDays: '30 天',
    cpu: 'CPU',
    ram: 'Ram',
    disk: 'Disk',
    network: '网络',
    connections: '连接数',
    processes: '进程数',
    tcp: 'TCP',
    udp: 'UDP',
    upload: '上行',
    download: '下行',
    noData: '无',
  }
}

function formatTime(timestamp: number, range: RangeKey) {
  const date = new Date(timestamp)

  if (range === '7d' || range === '30d') {
    return date.toLocaleDateString([], {
      month: '2-digit',
      day: '2-digit',
    })
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: range === 'realtime' ? '2-digit' : undefined,
  })
}

function toTimestamp(value: unknown) {
  if (typeof value === 'number') {
    if (value < 10_000_000_000) return value * 1000
    return value
  }

  if (typeof value === 'string') {
    const number = Number(value)

    if (Number.isFinite(number)) {
      if (number < 10_000_000_000) return number * 1000
      return number
    }

    const parsed = new Date(value).getTime()

    if (Number.isFinite(parsed)) return parsed
  }

  return Date.now()
}

function safeNumber(value: unknown) {
  const number = Number(value)

  if (!Number.isFinite(number)) return 0

  return number
}

function normalizeHistorySample(item: NodeMetricSample): ChartPoint {
  return {
    timestamp: item.timestamp,
    cpu: safeNumber(item.cpu),
    memory: safeNumber(item.memory),
    disk: safeNumber(item.disk),
    uploadSpeed: safeNumber(item.uploadSpeed),
    downloadSpeed: safeNumber(item.downloadSpeed),
    connections: safeNumber(item.connections),
    udpConnections: safeNumber(item.udpConnections),
    processes: safeNumber(item.processes),
  }
}

function normalizeApiRecord(raw: any): ChartPoint {
  return {
    timestamp: toTimestamp(
      raw.timestamp ??
        raw.time ??
        raw.created_at ??
        raw.createdAt ??
        raw.report_at ??
        raw.reportAt,
    ),
    cpu: safeNumber(raw.cpu ?? raw.cpu_usage ?? raw.cpuUsage),
    memory: safeNumber(raw.memory ?? raw.mem ?? raw.ram ?? raw.ram_usage ?? raw.ramUsage),
    disk: safeNumber(raw.disk ?? raw.disk_usage ?? raw.diskUsage),
    uploadSpeed: safeNumber(raw.uploadSpeed ?? raw.net_out ?? raw.netOut ?? raw.up),
    downloadSpeed: safeNumber(raw.downloadSpeed ?? raw.net_in ?? raw.netIn ?? raw.down),
    connections: safeNumber(raw.connections ?? raw.tcp ?? raw.tcp_connections),
    udpConnections: safeNumber(raw.udpConnections ?? raw.connections_udp ?? raw.udp),
    processes: safeNumber(raw.processes ?? raw.process ?? raw.process_count),
  }
}

function extractRecords(json: any) {
  const data = json?.data ?? json?.result ?? json?.records ?? json

  if (Array.isArray(data)) return data

  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.data)) return data.data

  return []
}

function buildRealtimeData(history?: NodeMetricSample[]) {
  const source = history ?? []

  return source.slice(-180).map(normalizeHistorySample)
}

async function fetchHistoricalLoad(nodeId: string, range: RangeKey) {
  const hours = RANGE_HOURS[range]

  if (!hours) return []

  const urls = [
    `/api/records/load?uuid=${encodeURIComponent(nodeId)}&hours=${hours}`,
    `/api/records/load?node_id=${encodeURIComponent(nodeId)}&hours=${hours}`,
    `/api/records/load?id=${encodeURIComponent(nodeId)}&hours=${hours}`,
  ]

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) continue

      const json = await response.json()
      const records = extractRecords(json).map(normalizeApiRecord)

      if (records.length > 0) {
        return records.sort((a: ChartPoint, b: ChartPoint) => a.timestamp - b.timestamp)
      }
    } catch {
      // 继续尝试下一个 URL
    }
  }

  return []
}

function averageValue(data: ChartPoint[], key: keyof ChartPoint) {
  if (data.length === 0) return 0

  const total = data.reduce((sum, item) => sum + safeNumber(item[key]), 0)

  return total / data.length
}

function latestValue(data: ChartPoint[], key: keyof ChartPoint) {
  const last = data[data.length - 1]

  if (!last) return 0

  return safeNumber(last[key])
}

function ChartCard({
  title,
  value,
  subtitle,
  data,
  range,
  children,
  yFormatter,
}: {
  title: string
  value: ReactNode
  subtitle?: ReactNode
  data: ChartPoint[]
  range: RangeKey
  children: ReactNode
  yFormatter?: (value: number) => string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-zinc-100">
            {title}
          </p>
        </div>

        <div className="shrink-0 text-right text-sm text-zinc-300">
          {value}

          {subtitle && (
            <div className="mt-1 text-zinc-500">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="h-[150px] min-w-0 rounded-xl bg-black/25 p-2">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <LineChart data={data}>
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(value) => formatTime(Number(value), range)}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(value) =>
                  yFormatter ? yFormatter(Number(value)) : String(value)
                }
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
                labelFormatter={(value) => formatTime(Number(value), range)}
              />

              {children}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export function LoadMetricsPanel({ node }: LoadMetricsPanelProps) {
  const { lang } = useI18n()
  const text = getText(lang)

  const [range, setRange] = useState<RangeKey>('realtime')
  const [historicalData, setHistoricalData] = useState<ChartPoint[]>([])

  const realtimeData = useMemo(() => {
    return buildRealtimeData(node.history)
  }, [node.history])

  useEffect(() => {
    let cancelled = false

    async function loadHistoricalData() {
      if (range === 'realtime') {
        setHistoricalData([])
        return
      }

      const records = await fetchHistoricalLoad(node.id, range)

      if (!cancelled) {
        setHistoricalData(records)
      }
    }

    loadHistoricalData()

    return () => {
      cancelled = true
    }
  }, [node.id, range])

  const data = range === 'realtime' ? realtimeData : historicalData

  const ranges: {
    key: RangeKey
    label: string
  }[] = [
    {
      key: 'realtime',
      label: text.realtime,
    },
    {
      key: '4h',
      label: text.fourHours,
    },
    {
      key: '1d',
      label: text.oneDay,
    },
    {
      key: '7d',
      label: text.sevenDays,
    },
    {
      key: '30d',
      label: text.thirtyDays,
    },
  ]

  return (
    <div className="min-w-0">
      <div className="mb-6 flex justify-center">
        <div className="flex rounded-full border border-white/[0.08] bg-white/[0.04] p-1 shadow-lg shadow-black/20">
          {ranges.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRange(item.key)}
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition sm:px-5',
                range === item.key
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <ChartCard
          title={text.cpu}
          value={`${latestValue(data, 'cpu').toFixed(2)}%`}
          data={data}
          range={range}
          yFormatter={(value) => `${value.toFixed(0)}`}
        >
          <Line
            type="monotone"
            dataKey="cpu"
            name={text.cpu}
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        </ChartCard>

        <ChartCard
          title={text.ram}
          value={`${latestValue(data, 'memory').toFixed(2)}%`}
          data={data}
          range={range}
          yFormatter={(value) => `${value.toFixed(0)}`}
        >
          <Line
            type="monotone"
            dataKey="memory"
            name={text.ram}
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        </ChartCard>

        <ChartCard
          title={text.disk}
          value={`${latestValue(data, 'disk').toFixed(2)}%`}
          data={data}
          range={range}
          yFormatter={(value) => `${value.toFixed(0)}`}
        >
          <Line
            type="monotone"
            dataKey="disk"
            name={text.disk}
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        </ChartCard>

        <ChartCard
          title={text.network}
          value={`↑ ${formatSpeed(latestValue(data, 'uploadSpeed'))}`}
          subtitle={`↓ ${formatSpeed(latestValue(data, 'downloadSpeed'))}`}
          data={data}
          range={range}
          yFormatter={(value) => formatBytes(value)}
        >
          <Line
            type="monotone"
            dataKey="uploadSpeed"
            name={text.upload}
            stroke="#7dd3fc"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="downloadSpeed"
            name={text.download}
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        </ChartCard>

        <ChartCard
          title={text.connections}
          value={`${text.tcp}: ${latestValue(data, 'connections').toFixed(0)}`}
          subtitle={`${text.udp}: ${latestValue(data, 'udpConnections').toFixed(0)}`}
          data={data}
          range={range}
          yFormatter={(value) => value.toFixed(0)}
        >
          <Line
            type="monotone"
            dataKey="connections"
            name={text.tcp}
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="udpConnections"
            name={text.udp}
            stroke="#7dd3fc"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        </ChartCard>

        <ChartCard
          title={text.processes}
          value={`${averageValue(data, 'processes').toFixed(0)}`}
          data={data}
          range={range}
          yFormatter={(value) => value.toFixed(0)}
        >
          <Line
            type="monotone"
            dataKey="processes"
            name={text.processes}
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        </ChartCard>
      </div>
    </div>
  )
}
