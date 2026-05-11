import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import worldJson from '../assets/world.geo.json'
import { useI18n } from '../i18n/I18nContext'
import { getCountryLabel } from '../utils/region'
import { useKomariData } from '../hooks/useKomariData'
import type { NodeItem } from '../data/mock'

echarts.registerMap('world', worldJson as any)

type TooltipState = {
  show: boolean
  x: number
  y: number
  countryName: string
}

function getCountryStatus(countryNodes: NodeItem[]) {
  if (countryNodes.length === 0) return undefined

  const onlineCount = countryNodes.filter((node) => node.status === 'online').length
  const offlineCount = countryNodes.filter((node) => node.status === 'offline').length

  if (offlineCount === countryNodes.length) return 0
  if (onlineCount === countryNodes.length) return 1

  return 2
}

function getEventPosition(params: any) {
  const event = params?.event?.event || params?.event

  return {
    x: Number(event?.offsetX ?? 0),
    y: Number(event?.offsetY ?? 0),
  }
}

function StatusGroup({
  title,
  nodes,
  color,
}: {
  title: string
  nodes: NodeItem[]
  color: string
}) {
  if (nodes.length === 0) return null

  return (
    <div className="mt-3">
      <div
        className="mb-1 text-xs font-semibold"
        style={{
          color,
        }}
      >
        {title} · {nodes.length}
      </div>

      <div className="space-y-1.5">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="flex min-w-0 items-center justify-between gap-4 text-sm text-zinc-300"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}`,
                }}
              />
              <span className="min-w-0 truncate">{node.name}</span>
            </span>

            <span className="shrink-0 text-zinc-400">
              {node.status === 'online' ? '在线' : '离线'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MapTooltip({
  tooltip,
  nodes,
}: {
  tooltip: TooltipState
  nodes: NodeItem[]
}) {
  const { t, format, lang } = useI18n()

  if (!tooltip.show) return null

  const countryNodes = nodes.filter((node) => node.country === tooltip.countryName)

  const title =
    countryNodes.length > 0
      ? getCountryLabel(countryNodes[0].countryCode, lang)
      : tooltip.countryName

  const onlineNodes = countryNodes.filter((node) => node.status === 'online')
  const offlineNodes = countryNodes.filter((node) => node.status === 'offline')
  const partialNodes = countryNodes.filter(
    (node) => node.status !== 'online' && node.status !== 'offline',
  )

  return (
    <div
      className="pointer-events-none absolute z-30 min-w-[260px] max-w-[340px] rounded-2xl border border-white/[0.08] bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur-xl"
      style={{
        left: Math.min(Math.max(tooltip.x + 18, 12), 760),
        top: Math.max(tooltip.y + 18, 12),
      }}
    >
      <div className="text-sm font-bold text-zinc-100">{title}</div>

      {countryNodes.length === 0 ? (
        <div className="mt-2 text-sm text-zinc-500">{t.noServers}</div>
      ) : (
        <>
          <div className="mt-2 text-xs text-zinc-400">
            {format(t.totalServers, { count: countryNodes.length })}
          </div>

          <StatusGroup title={t.online} nodes={onlineNodes} color="#22c55e" />
          <StatusGroup title={t.partialOnline} nodes={partialNodes} color="#f97316" />
          <StatusGroup title={t.offline} nodes={offlineNodes} color="#ef4444" />
        </>
      )}
    </div>
  )
}

export function WorldMap() {
  const { t } = useI18n()
  const { nodes } = useKomariData()

  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    countryName: '',
  })

  const countryNames = useMemo(() => {
    return Array.from(new Set(nodes.map((node) => node.country)))
  }, [nodes])

  const mapData = useMemo(() => {
    return countryNames.map((country) => {
      const countryNodes = nodes.filter((node) => node.country === country)

      return {
        name: country,
        value: getCountryStatus(countryNodes),
      }
    })
  }, [countryNames, nodes])

  const option: EChartsOption = {
    backgroundColor: 'transparent',

    // 关闭 ECharts 自带 tooltip，改用 React 自定义 tooltip
    tooltip: {
      show: false,
    },

    visualMap: {
      show: false,
      min: 0,
      max: 2,
      inRange: {
        color: ['#ef4444', '#22c55e', '#f97316'],
      },
    },

    series: [
      {
        name: '服务器地区',
        type: 'map',
        map: 'world',
        roam: false,

        animation: false,
        animationDurationUpdate: 0,

        layoutCenter: ['50%', '50%'],
        layoutSize: '108%',

        label: {
          show: false,
        },

        itemStyle: {
          areaColor: '#1f2933',
          borderColor: 'rgba(255,255,255,0.09)',
          borderWidth: 0.7,
        },

        emphasis: {
          label: {
            show: false,
          },
          itemStyle: {
            areaColor: '#334155',
          },
        },

        data: mapData,
      },
    ],
  }

  const onEvents = {
    mouseover: (params: any) => {
      if (params?.seriesType !== 'map') return

      const { x, y } = getEventPosition(params)

      setTooltip({
        show: true,
        x,
        y,
        countryName: params.name,
      })
    },

    mousemove: (params: any) => {
      if (params?.seriesType !== 'map') return

      const { x, y } = getEventPosition(params)

      setTooltip((current) => ({
        ...current,
        show: true,
        x,
        y,
        countryName: params.name || current.countryName,
      }))
    },

    mouseout: () => {
      setTooltip((current) => ({
        ...current,
        show: false,
      }))
    },

    globalout: () => {
      setTooltip((current) => ({
        ...current,
        show: false,
      }))
    },
  }

  return (
    <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070b0f] shadow-2xl shadow-black/40">
      <div className="relative aspect-[16/8.2] min-h-[360px] w-full min-w-0 max-sm:aspect-[4/3] max-sm:min-h-[300px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(34,197,94,0.14),transparent_24%),radial-gradient(circle_at_75%_45%,rgba(59,130,246,0.09),transparent_22%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,52px_52px,52px_52px]" />

        <ReactECharts
          option={option}
          notMerge
          lazyUpdate
          onEvents={onEvents}
          opts={{
            renderer: 'canvas',
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        />

        <MapTooltip tooltip={tooltip} nodes={nodes} />

        <div className="absolute bottom-4 left-4 rounded-2xl border border-white/[0.08] bg-black/55 p-3 shadow-xl shadow-black/30 backdrop-blur-xl sm:bottom-6 sm:left-6 sm:p-4">
          <div className="space-y-3 text-sm text-zinc-200 sm:text-base">
            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
              <span className="whitespace-nowrap">{t.allOnline}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.8)]" />
              <span className="whitespace-nowrap">{t.partialOnline}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)]" />
              <span className="whitespace-nowrap">{t.allOffline}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
