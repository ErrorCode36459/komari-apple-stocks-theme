import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  nodes as mockNodes,
  type LatencyTarget,
  type NodeItem,
  type NodeMetricSample,
  type NodeStatus,
} from '../data/mock'
import {
  clampNumber,
  fallbackText,
  formatBytes,
  formatLastReport,
  formatSpeed,
} from '../utils/format'

type RawKomariNode = {
  uuid: string
  name: string
  cpu_name?: string
  virtualization?: string
  arch?: string
  cpu_cores?: number
  os?: string
  kernel_version?: string
  gpu_name?: string
  region?: string
  mem_total?: number
  swap_total?: number
  disk_total?: number
  traffic_limit?: number
  traffic_limit_type?: string
  updated_at?: string
  created_at?: string
  expired_at?: string
  price?: number
  billing_cycle?: number
  auto_renewal?: boolean
  currency?: string
  tags?: string
  group?: string
  public_remark?: string
  public_note?: string
  public_memo?: string
  remark?: string
  note?: string
  hidden?: boolean
  weight?: number
}

type RawLatestStatus = {
  online?: boolean
  client?: string
  cpu?: number
  ram?: number
  swap?: number
  load?: number
  load5?: number
  load15?: number
  disk?: number
  net_out?: number
  net_in?: number
  net_total_out?: number
  net_total_up?: number
  net_total_in?: number
  net_total_down?: number
  connections?: number
  connections_udp?: number
  gpu?: number
  uptime?: number
  process?: number
  time?: string | number
}

type UseKomariDataResult = {
  nodes: NodeItem[]
  overview: {
    currentTime: string
    onlineText: string
    countryCount: number
    totalUpload: string
    totalDownload: string
    uploadSpeed: string
    downloadSpeed: string
    onlineNodes: NodeItem[]
    partialNodes: NodeItem[]
    offlineNodes: NodeItem[]
  }
  loading: boolean
  error: string | null
  usingFallback: boolean
  refresh: () => void
}

const POLL_INTERVAL = 2000
const MAX_HISTORY_POINTS = 240
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

const historyStore: Record<string, NodeMetricSample[]> = {}

const geoNameAlias: Record<string, string> = {
  HK: 'China',
  MO: 'China',
  CN: 'China',
  TW: 'Taiwan',

  US: 'United States of America',
  GB: 'United Kingdom',
  UK: 'United Kingdom',

  KR: 'South Korea',
  KP: 'North Korea',

  RU: 'Russia',
  VN: 'Vietnam',
  TR: 'Turkey',
  IR: 'Iran',
  SY: 'Syria',
  LA: 'Laos',
  BO: 'Bolivia',
  VE: 'Venezuela',
  TZ: 'Tanzania',
  MD: 'Moldova',
  BN: 'Brunei',
}

const emojiFallbackMap: Record<string, string> = {
  '🇨🇳': 'CN',
  '🇭🇰': 'HK',
  '🇲🇴': 'MO',
  '🇹🇼': 'TW',
  '🇯🇵': 'JP',
  '🇸🇬': 'SG',
  '🇺🇸': 'US',
  '🇩🇪': 'DE',
  '🇧🇷': 'BR',
  '🇦🇺': 'AU',
  '🇬🇧': 'GB',
  '🇫🇷': 'FR',
  '🇳🇱': 'NL',
  '🇨🇦': 'CA',
  '🇰🇷': 'KR',
}

function getGeoMapName(countryCode: string) {
  const code = countryCode.toUpperCase()

  if (geoNameAlias[code]) {
    return geoNameAlias[code]
  }

  try {
    const displayNames = new Intl.DisplayNames(['en'], {
      type: 'region',
    })

    return displayNames.of(code) ?? code
  } catch {
    return code
  }
}

function roundNumber(value: unknown, digits = 2) {
  const number = Number(value)

  if (!Number.isFinite(number)) return 0

  return Number(number.toFixed(digits))
}

function roundPercent(value: unknown, digits = 2) {
  return roundNumber(clampNumber(value, 0, 100), digits)
}

function formatPercentText(value: unknown, digits = 2) {
  return `${roundPercent(value, digits).toFixed(digits)}%`
}

function flagEmojiToCountryCode(flag?: string) {
  if (!flag) return 'UN'

  const trimmed = flag.trim()

  if (emojiFallbackMap[trimmed]) {
    return emojiFallbackMap[trimmed]
  }

  const codePoints = Array.from(trimmed)

  if (codePoints.length < 2) return 'UN'

  const code = codePoints
    .slice(0, 2)
    .map((char) => {
      const point = char.codePointAt(0)
      if (!point) return ''
      return String.fromCharCode(point - 0x1f1e6 + 65)
    })
    .join('')

  return /^[A-Z]{2}$/.test(code) ? code : 'UN'
}

function formatDuration(secondsValue: unknown) {
  const seconds = Number(secondsValue)

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0天 0时'
  }

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}天 ${hours}时 ${minutes}分`
  if (hours > 0) return `${hours}时 ${minutes}分`

  return `${minutes}分`
}

function formatThirtyDayUptimePercent(status?: RawLatestStatus) {
  const uptimeSeconds = Number(status?.uptime ?? 0)

  if (!Number.isFinite(uptimeSeconds) || uptimeSeconds <= 0) {
    return '--'
  }

  const percent =
    (Math.min(uptimeSeconds, THIRTY_DAYS_SECONDS) / THIRTY_DAYS_SECONDS) * 100

  return formatPercentText(percent, 2)
}

function getStatusFromLatest(status?: RawLatestStatus): NodeStatus {
  return status?.online ? 'online' : 'offline'
}

function getMemoryPercent(node: RawKomariNode, status?: RawLatestStatus) {
  const used = Number(status?.ram ?? 0)
  const total = Number(node.mem_total ?? 0)

  if (!total || total <= 0) return 0

  return roundPercent((used / total) * 100, 2)
}

function getDiskPercent(node: RawKomariNode, status?: RawLatestStatus) {
  const used = Number(status?.disk ?? 0)
  const total = Number(node.disk_total ?? 0)

  if (!total || total <= 0) return 0

  return roundPercent((used / total) * 100, 2)
}

function getCpuPercent(status?: RawLatestStatus) {
  return roundPercent(status?.cpu ?? 0, 2)
}

function getTrafficUsedBytes(status?: RawLatestStatus) {
  const up = Number(status?.net_total_out ?? status?.net_total_up ?? 0)
  const down = Number(status?.net_total_in ?? status?.net_total_down ?? 0)

  return up + down
}

function getTraffic24h(status?: RawLatestStatus) {
  return formatBytes(getTrafficUsedBytes(status))
}

function getTrafficLimitBytes(raw: RawKomariNode) {
  const limit = Number(raw.traffic_limit ?? 0)

  if (!Number.isFinite(limit) || limit <= 0) {
    return 0
  }

  return limit
}

function getPublicRemark(raw: RawKomariNode) {
  return (
    raw.public_remark ||
    raw.public_note ||
    raw.public_memo ||
    raw.remark ||
    raw.note ||
    ''
  )
}

function normalizeLatencyTargets(): LatencyTarget[] {
  return []
}

function createMetricSample(
  node: RawKomariNode,
  status?: RawLatestStatus,
): NodeMetricSample {
  const now = Date.now()

  return {
    timestamp: now,
    time: new Date(now).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    cpu: getCpuPercent(status),
    memory: getMemoryPercent(node, status),
    disk: getDiskPercent(node, status),
    uploadSpeed: Number(status?.net_out ?? 0),
    downloadSpeed: Number(status?.net_in ?? 0),
    totalUpload: Number(status?.net_total_out ?? status?.net_total_up ?? 0),
    totalDownload: Number(status?.net_total_in ?? status?.net_total_down ?? 0),
    connections: Number(status?.connections ?? 0),
    udpConnections: Number(status?.connections_udp ?? 0),
    processes: Number(status?.process ?? 0),
  }
}

function appendHistory(nodes: RawKomariNode[], latestMap: Record<string, RawLatestStatus>) {
  const now = Date.now()

  nodes.forEach((node) => {
    const status = latestMap[node.uuid]
    const sample = createMetricSample(node, status)

    const list = historyStore[node.uuid] ?? []
    const last = list[list.length - 1]

    if (last && now - last.timestamp < 1500) return

    historyStore[node.uuid] = [...list, sample].slice(-MAX_HISTORY_POINTS)
  })
}

function ensureHistory(node: RawKomariNode, status?: RawLatestStatus) {
  const existing = historyStore[node.uuid]

  if (existing && existing.length > 0) return existing

  const sample = createMetricSample(node, status)
  historyStore[node.uuid] = [sample]

  return historyStore[node.uuid]
}

function normalizeNode(
  raw: RawKomariNode,
  latestMap: Record<string, RawLatestStatus>,
): NodeItem {
  const status = latestMap[raw.uuid]
  const countryCode = flagEmojiToCountryCode(raw.region)
  const country = getGeoMapName(countryCode)

  const cpu = getCpuPercent(status)
  const memory = getMemoryPercent(raw, status)
  const disk = getDiskPercent(raw, status)

  const uploadSpeed = formatSpeed(status?.net_out ?? 0)
  const downloadSpeed = formatSpeed(status?.net_in ?? 0)
  const totalUpload = formatBytes(status?.net_total_out ?? status?.net_total_up ?? 0)
  const totalDownload = formatBytes(status?.net_total_in ?? status?.net_total_down ?? 0)

  const trafficUsedBytes = getTrafficUsedBytes(status)
  const trafficLimitBytes = getTrafficLimitBytes(raw)

  return {
    id: raw.uuid,
    name: raw.name,
    region: raw.region || countryCode,
    countryCode,
    country,

    cpu,
    memory,
    disk,

    ping: 0,
    uptime: formatThirtyDayUptimePercent(status),

    traffic24h: getTraffic24h(status),
    trafficUsed: formatBytes(trafficUsedBytes),
    trafficLimit: trafficLimitBytes > 0 ? formatBytes(trafficLimitBytes) : '',
    trafficLimitBytes,

    uploadSpeed,
    downloadSpeed,
    totalUpload,
    totalDownload,

    change: 0,
    status: getStatusFromLatest(status),
    latencyTargets: normalizeLatencyTargets(),
    history: ensureHistory(raw, status),

    tags: raw.tags || '',
    group: raw.group || '',
    publicRemark: getPublicRemark(raw),
    billing: {
      price: Number(raw.price ?? -1),
      currency: raw.currency || '',
      billingCycle: Number(raw.billing_cycle ?? 0),
      expiredAt: raw.expired_at || '',
      autoRenewal: Boolean(raw.auto_renewal),
    },

    system: {
      cpuModel: fallbackText(raw.cpu_name, '--'),
      cores: raw.cpu_cores ? `${raw.cpu_cores} Cores` : '--',
      arch: fallbackText(raw.arch, '--'),
      virtualization: fallbackText(raw.virtualization, '--'),
      gpu: fallbackText(raw.gpu_name, 'None'),
      os: fallbackText(raw.os, '--'),
      kernel: fallbackText(raw.kernel_version, '--'),

      memory: Number(raw.mem_total ?? 0) > 0 ? formatBytes(raw.mem_total) : '--',
      swap: Number(raw.swap_total ?? 0) > 0 ? formatBytes(raw.swap_total) : '0 B',
      disk: Number(raw.disk_total ?? 0) > 0 ? formatBytes(raw.disk_total) : '--',

      runningTime: formatDuration(status?.uptime),
      lastReport: formatLastReport(status?.time ?? raw.updated_at),
    },
  }
}

async function fetchNodes() {
  const response = await fetch('/api/nodes', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`/api/nodes HTTP ${response.status}`)
  }

  const json = await response.json()

  const list = Array.isArray(json)
    ? json
    : Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.nodes)
        ? json.nodes
        : []

  return list as RawKomariNode[]
}

async function rpc2Call<TResult = any>(method: string, params?: any): Promise<TResult> {
  const response = await fetch('/api/rpc2', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }),
  })

  if (!response.ok) {
    throw new Error(`/api/rpc2 HTTP ${response.status}`)
  }

  const json = await response.json()

  if (json.error) {
    throw new Error(json.error.message || 'RPC2 Error')
  }

  return json.result
}

async function fetchLatestStatus() {
  const result = await rpc2Call<Record<string, RawLatestStatus>>(
    'common:getNodesLatestStatus',
  )

  return result || {}
}

function useKomariDataValue(): UseKomariDataResult {
  const [rawNodes, setRawNodes] = useState<RawKomariNode[] | null>(null)
  const [latestMap, setLatestMap] = useState<Record<string, RawLatestStatus>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [timeTick, setTimeTick] = useState(0)

  const refresh = useCallback(() => {
    setRefreshIndex((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadStaticNodes() {
      setLoading(true)
      setError(null)

      try {
        const list = await fetchNodes()

        if (!cancelled) {
          setRawNodes(list)
        }
      } catch (currentError) {
        if (!cancelled) {
          setRawNodes(null)
          setError(
            currentError instanceof Error
              ? currentError.message
              : 'Failed to fetch nodes',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStaticNodes()

    return () => {
      cancelled = true
    }
  }, [refreshIndex])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let running = false

    async function pollLatest() {
      if (running) return

      running = true

      try {
        const latest = await fetchLatestStatus()

        if (!cancelled) {
          setLatestMap(latest)

          if (rawNodes && rawNodes.length > 0) {
            appendHistory(rawNodes, latest)
          }
        }
      } catch (currentError) {
        if (!cancelled) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : 'Failed to fetch latest status',
          )
        }
      } finally {
        running = false

        if (!cancelled) {
          timer = window.setTimeout(pollLatest, POLL_INTERVAL)
        }
      }
    }

    pollLatest()

    return () => {
      cancelled = true

      if (timer) {
        window.clearTimeout(timer)
      }
    }
  }, [refreshIndex, rawNodes])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeTick((value) => value + 1)
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const realNodes = useMemo(() => {
    if (!rawNodes || rawNodes.length === 0) return null

    return rawNodes
      .filter((node) => !node.hidden)
      .sort((a, b) => Number(a.weight ?? 0) - Number(b.weight ?? 0))
      .map((node) => normalizeNode(node, latestMap))
  }, [rawNodes, latestMap])

  const nodes = realNodes && realNodes.length > 0 ? realNodes : mockNodes
  const usingFallback = !realNodes || realNodes.length === 0

  const overview = useMemo(() => {
    const onlineNodes = nodes.filter((node) => node.status === 'online')
    const partialNodes: NodeItem[] = []
    const offlineNodes = nodes.filter((node) => node.status === 'offline')

    const countryCount = new Set(nodes.map((node) => node.countryCode)).size

    const totalUploadBytes = Object.values(latestMap).reduce(
      (sum, item) => sum + Number(item.net_total_out ?? item.net_total_up ?? 0),
      0,
    )

    const totalDownloadBytes = Object.values(latestMap).reduce(
      (sum, item) => sum + Number(item.net_total_in ?? item.net_total_down ?? 0),
      0,
    )

    const uploadSpeedBytes = Object.values(latestMap).reduce(
      (sum, item) => sum + Number(item.net_out ?? 0),
      0,
    )

    const downloadSpeedBytes = Object.values(latestMap).reduce(
      (sum, item) => sum + Number(item.net_in ?? 0),
      0,
    )

    return {
      currentTime: new Date().toLocaleTimeString(),
      onlineText: `${onlineNodes.length} / ${nodes.length}`,
      countryCount,

      totalUpload: formatBytes(totalUploadBytes),
      totalDownload: formatBytes(totalDownloadBytes),

      uploadSpeed: formatSpeed(uploadSpeedBytes),
      downloadSpeed: formatSpeed(downloadSpeedBytes),

      onlineNodes,
      partialNodes,
      offlineNodes,
    }
  }, [nodes, latestMap, timeTick])

  return {
    nodes,
    overview,
    loading,
    error,
    usingFallback,
    refresh,
  }
}

const KomariDataContext = createContext<UseKomariDataResult | null>(null)

export function KomariDataProvider({ children }: { children: ReactNode }) {
  const value = useKomariDataValue()

  return (
    <KomariDataContext.Provider value={value}>
      {children}
    </KomariDataContext.Provider>
  )
}

export function useKomariData() {
  const context = useContext(KomariDataContext)

  if (!context) {
    throw new Error('useKomariData must be used inside KomariDataProvider')
  }

  return context
}
