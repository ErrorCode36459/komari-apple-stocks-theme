import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Radio,
  Server,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { NodeItem } from '../data/mock'
import { useI18n } from '../i18n/I18nContext'

function MetricCard({
  label,
  value,
  sub,
  icon,
  danger = false,
}: {
  label: string
  value: string
  sub: string
  icon: ReactNode
  danger?: boolean
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-zinc-400">
          {label}
        </p>

        <div className={danger ? 'text-orange-400' : 'text-emerald-400'}>
          {icon}
        </div>
      </div>

      <p className="min-w-0 break-words text-3xl font-semibold tracking-tight text-zinc-100">
        {value}
      </p>

      {sub && (
        <p
          className={[
            'mt-3 text-sm',
            danger ? 'text-orange-300' : 'text-emerald-300',
          ].join(' ')}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function getMetricText(lang: string) {
  if (lang === 'en') {
    return {
      runningTime: 'Running Time',
      uptime: 'Uptime',
      trafficUsage: 'Traffic Usage',
      cpu: 'CPU',
      memory: 'Memory',
      disk: 'Disk',
      online: 'Online',
      offline: 'Offline',
      recent30Days: 'Last 30 days',
    }
  }

  if (lang === 'zh-TW') {
    return {
      runningTime: '運行時間',
      uptime: '在線率',
      trafficUsage: '流量使用情況',
      cpu: 'CPU',
      memory: '記憶體',
      disk: '磁碟',
      online: '在線',
      offline: '離線',
      recent30Days: '近 30 天',
    }
  }

  return {
    runningTime: '运行时间',
    uptime: '在线率',
    trafficUsage: '流量使用情况',
    cpu: 'CPU',
    memory: '内存',
    disk: '磁盘',
    online: '在线',
    offline: '离线',
    recent30Days: '近 30 天',
  }
}

function localizeDuration(value: string, lang: string) {
  if (lang === 'en') {
    return value
      .replace(/天/g, 'd')
      .replace(/时/g, 'h')
      .replace(/分/g, 'm')
  }

  if (lang === 'zh-TW') {
    return value
      .replace(/天/g, '天')
      .replace(/时/g, '時')
      .replace(/分/g, '分')
  }

  return value
}

function getTrafficText(node: NodeItem) {
  const used = node.trafficUsed || node.traffic24h || '--'
  const limit = node.trafficLimit || ''
  const limitBytes = node.trafficLimitBytes ?? 0

  if (limitBytes > 0 && limit) {
    return `${used} / ${limit}`
  }

  return used
}

export function NodeMetricGrid({ node }: { node: NodeItem }) {
  const { lang } = useI18n()
  const text = getMetricText(lang)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <MetricCard
        label={text.runningTime}
        value={localizeDuration(node.system.runningTime, lang)}
        sub={node.status === 'online' ? text.online : text.offline}
        icon={<Radio className="h-5 w-5" />}
        danger={node.status !== 'online'}
      />

      <MetricCard
        label={text.uptime}
        value={node.uptime}
        sub={text.recent30Days}
        icon={<Activity className="h-5 w-5" />}
      />

      <MetricCard
        label={text.trafficUsage}
        value={getTrafficText(node)}
        sub=""
        icon={<Server className="h-5 w-5" />}
      />

      <MetricCard
        label={text.cpu}
        value={`${node.cpu.toFixed(2)}%`}
        sub=""
        icon={<Cpu className="h-5 w-5" />}
      />

      <MetricCard
        label={text.memory}
        value={`${node.memory.toFixed(2)}%`}
        sub=""
        icon={<MemoryStick className="h-5 w-5" />}
      />

      <MetricCard
        label={text.disk}
        value={`${node.disk.toFixed(2)}%`}
        sub=""
        icon={<HardDrive className="h-5 w-5" />}
        danger={node.disk >= 80}
      />
    </div>
  )
}
