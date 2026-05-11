import { Globe2 } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { getCountryLabel, getRegionLabel } from '../utils/region'
import { useKomariData } from '../hooks/useKomariData'
import { getStatusDotClass } from '../utils/status'
import type { NodeItem, NodeMetricSample } from '../data/mock'

type SidebarVariant = 'full' | 'mobileTop' | 'watchlistOnly'

type SidebarProps = {
  activePage: 'overview' | 'node'
  activeNodeId: string
  onOverviewClick: () => void
  onNodeClick: (id: string) => void
  variant?: SidebarVariant
  searchQuery?: string
}

function buildSparklinePath(history?: NodeMetricSample[]) {
  const source = history?.slice(-18) ?? []

  if (source.length === 0) {
    return 'M2 23 L20 20 L40 18 L60 22 L80 16 L100 20 L118 24'
  }

  const width = 118
  const height = 28

  return source
    .map((item, index) => {
      const x = 2 + (index / Math.max(source.length - 1, 1)) * width
      const y = 2 + height - (item.cpu / 100) * height

      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function MiniSparkline({
  danger = false,
  history,
}: {
  danger?: boolean
  history?: NodeMetricSample[]
}) {
  const path = buildSparklinePath(history)

  return (
    <svg viewBox="0 0 120 32" className="h-8 w-24 shrink-0 sm:w-28">
      <path
        d={path}
        fill="none"
        stroke={danger ? '#f97316' : '#22c55e'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d={`${path} L118 32 L2 32 Z`}
        fill={danger ? 'rgba(249,115,22,0.18)' : 'rgba(34,197,94,0.18)'}
      />
    </svg>
  )
}

function getRemainingDays(expiredAt?: string) {
  if (!expiredAt) return null

  const end = new Date(expiredAt).getTime()

  if (Number.isNaN(end)) return null

  return Math.ceil((end - Date.now()) / 86400000)
}

function getSidebarText(lang: string) {
  if (lang === 'en') {
    return {
      free: 'Free',
      day: 'd',
      daysLeft: 'left',
    }
  }

  if (lang === 'zh-TW') {
    return {
      free: '免費',
      day: '天',
      daysLeft: '餘',
    }
  }

  return {
    free: '免费',
    day: '天',
    daysLeft: '余',
  }
}

function getBillingText(node: NodeItem, lang: string) {
  const billing = node.billing
  const text = getSidebarText(lang)

  if (!billing) return ''

  if (billing.price === 0) return ''

  if (billing.price === -1) {
    return text.free
  }

  if (billing.price < -1) return ''

  const price = `${billing.currency || ''}${billing.price}`
  const cycle = billing.billingCycle > 0 ? `/${billing.billingCycle}${text.day}` : ''
  const remain = getRemainingDays(billing.expiredAt)

  if (remain === null) {
    return `${price}${cycle}`
  }

  if (lang === 'en') {
    return `${price}${cycle} · ${remain}${text.day} ${text.daysLeft}`
  }

  return `${price}${cycle} · ${text.daysLeft}${remain}${text.day}`
}

function splitTags(tags?: string) {
  if (!tags) return []

  return tags
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function MetaBadges({ node, lang }: { node: NodeItem; lang: string }) {
  const tags = splitTags(node.tags)
  const billingText = getBillingText(node, lang)

  const badges = [
    ...tags.map((tag) => ({
      key: `tag-${tag}`,
      text: tag,
      className: 'bg-emerald-500/12 text-emerald-300',
    })),

    node.group
      ? {
          key: 'group',
          text: node.group,
          className: 'bg-sky-500/12 text-sky-300',
        }
      : null,

    node.publicRemark
      ? {
          key: 'remark',
          text: node.publicRemark,
          className: 'bg-purple-500/12 text-purple-300',
        }
      : null,

    billingText
      ? {
          key: 'billing',
          text: billingText,
          className: 'bg-amber-500/12 text-amber-300',
        }
      : null,
  ].filter(Boolean) as {
    key: string
    text: string
    className: string
  }[]

  if (badges.length === 0) return null

  return (
    <div className="mt-2 flex min-w-0 flex-wrap justify-end gap-1 pl-8">
      {badges.slice(0, 4).map((badge) => (
        <span
          key={badge.key}
          title={badge.text}
          className={[
            'max-w-[150px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4',
            badge.className,
          ].join(' ')}
        >
          {badge.text}
        </span>
      ))}
    </div>
  )
}

export function Sidebar({
  activePage,
  activeNodeId,
  onOverviewClick,
  onNodeClick,
  variant = 'full',
  searchQuery = '',
}: SidebarProps) {
  const { t, lang } = useI18n()
  const { nodes } = useKomariData()

  const showOverviewButton = variant === 'full' || variant === 'mobileTop'
  const showWatchlist = variant === 'full' || variant === 'watchlistOnly'

  const keyword = searchQuery.trim().toLowerCase()

  const filteredNodes = nodes.filter((node) => {
    if (!keyword) return true

    const region = getRegionLabel(node, lang)
    const country = getCountryLabel(node.countryCode, lang)

    return [
      node.name,
      node.region,
      node.country,
      node.countryCode,
      region,
      country,
      node.status,
      node.tags,
      node.group,
      node.publicRemark,
      String(node.cpu),
    ]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })

  return (
    <aside className="w-full shrink-0 xl:w-[360px]">
      {showOverviewButton && (
        <button
          onClick={onOverviewClick}
          className={[
            'flex w-full min-w-0 items-center gap-3 rounded-2xl border px-5 py-4 text-left text-lg font-semibold transition',
            variant === 'full' ? 'mb-4' : '',
            activePage === 'overview'
              ? 'border-emerald-500/45 bg-emerald-500/10 text-zinc-100 shadow-lg shadow-emerald-950/30'
              : 'border-white/[0.08] bg-white/[0.045] text-zinc-300 hover:bg-white/[0.07]',
          ].join(' ')}
        >
          <Globe2 className="h-6 w-6 shrink-0 text-emerald-400" />
          <span className="min-w-0 truncate">{t.serverOverview}</span>
        </button>
      )}

      {showWatchlist && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <p className="min-w-0 truncate text-sm font-medium tracking-wide text-zinc-400">
              {t.watchlist}
            </p>

            {keyword && (
              <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-500">
                {filteredNodes.length}/{nodes.length}
              </span>
            )}
          </div>

          {nodes.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-8 text-center text-sm text-zinc-500">
              {t.noServers}
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-8 text-center text-sm text-zinc-500">
              {t.noMatchingNodes}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-1">
              {filteredNodes.map((node) => {
                const active = activePage === 'node' && activeNodeId === node.id
                const danger = node.status !== 'online'

                return (
                  <button
                    key={node.id}
                    onClick={() => onNodeClick(node.id)}
                    className={[
                      'w-full min-w-0 rounded-xl px-3 py-3 text-left transition',
                      active
                        ? 'bg-white/[0.09] ring-1 ring-white/[0.14]'
                        : 'hover:bg-white/[0.055]',
                    ].join(' ')}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(
                          node.status,
                        )}`}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                          {node.name}
                        </p>

                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {getRegionLabel(node, lang)}
                        </p>
                      </div>

                      <div className="hidden shrink-0 sm:block">
                        <MiniSparkline danger={danger} history={node.history} />
                      </div>

                      <div className="w-16 shrink-0 text-right">
                        <p className="text-xl font-semibold tabular-nums text-zinc-100">
                          {node.cpu.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <MetaBadges node={node} lang={lang} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
