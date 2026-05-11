import { useEffect, useMemo, useState } from 'react'
import { Globe2 } from 'lucide-react'
import { CpuUsageChart } from '../components/CpuUsageChart'
import { LoadMetricsPanel } from '../components/LoadMetricsPanel'
import { LatencyPanel } from '../components/LatencyPanel'
import { NodeMetricGrid } from '../components/NodeMetricGrid'
import { SystemInfoPanel } from '../components/SystemInfoPanel'
import { useKomariData } from '../hooks/useKomariData'
import { useI18n } from '../i18n/I18nContext'
import { getRegionLabel } from '../utils/region'

type NodePageProps = {
  nodeId: string
}

type NodeTab = 'overview' | 'load' | 'latency'

function getStatusBadgeClass(status: string) {
  if (status === 'online') {
    return 'bg-emerald-500/15 text-emerald-300'
  }

  return 'bg-red-500/15 text-red-300'
}

function getNodePageText(lang: string) {
  if (lang === 'en') {
    return {
      overview: 'Overview',
      load: 'Load',
      latency: 'Latency',
      online: 'Online',
      offline: 'Offline',
    }
  }

  if (lang === 'zh-TW') {
    return {
      overview: '概覽',
      load: '負載',
      latency: '延遲',
      online: '在線',
      offline: '離線',
    }
  }

  return {
    overview: '概览',
    load: '负载',
    latency: '延迟',
    online: '在线',
    offline: '离线',
  }
}

export function NodePage({ nodeId }: NodePageProps) {
  const { nodes } = useKomariData()
  const { t, lang } = useI18n()
  const text = getNodePageText(lang)

  const [activeTab, setActiveTab] = useState<NodeTab>('overview')

  const node = useMemo(() => {
    return nodes.find((item) => item.id === nodeId) ?? nodes[0]
  }, [nodes, nodeId])

  useEffect(() => {
    setActiveTab('overview')
  }, [nodeId])

  if (!node) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-10 text-center text-zinc-500">
        {t.noServers}
      </div>
    )
  }

  const tabs: {
    key: NodeTab
    label: string
  }[] = [
    {
      key: 'overview',
      label: text.overview,
    },
    {
      key: 'load',
      label: text.load,
    },
    {
      key: 'latency',
      label: text.latency,
    },
  ]

  const regionLabel = getRegionLabel(node, lang)

  return (
    <div className="min-w-0">
      <div className="mb-5 min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-4xl font-bold tracking-tight text-zinc-100">
            {node.name}
          </h1>

          <span
            className={[
              'shrink-0 rounded-full px-3 py-1 text-sm font-semibold',
              getStatusBadgeClass(node.status),
            ].join(' ')}
          >
            {node.status === 'online' ? text.online : text.offline}
          </span>
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-lg text-zinc-400">
          <Globe2 className="h-5 w-5 shrink-0 text-zinc-500" />

          <span className="min-w-0 truncate">
            {regionLabel}
          </span>
        </div>
      </div>

      <div className="mb-6 flex min-w-0">
        <div className="flex rounded-full border border-white/[0.08] bg-white/[0.04] p-1 shadow-lg shadow-black/20">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'rounded-full px-5 py-2 text-sm font-medium transition',
                activeTab === tab.key
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
          <div className="min-w-0 space-y-6">
            <CpuUsageChart node={node} />
            <NodeMetricGrid node={node} />
          </div>

          <div className="min-w-0">
            <SystemInfoPanel node={node} />
          </div>
        </div>
      )}

      {activeTab === 'load' && <LoadMetricsPanel node={node} />}

      {activeTab === 'latency' && <LatencyPanel node={node} />}
    </div>
  )
}
