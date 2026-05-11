import {
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Monitor,
  Network,
  Server,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { NodeItem } from '../data/mock'
import { useI18n } from '../i18n/I18nContext'

function localizeDuration(value: string, lang: string) {
  if (lang === 'en') {
    return value
      .replace(/天/g, 'd ')
      .replace(/时/g, 'h ')
      .replace(/分/g, 'm')
      .replace(/\s+/g, ' ')
      .trim()
  }

  if (lang === 'zh-TW') {
    return value
      .replace(/时/g, '時')
      .replace(/运行/g, '運行')
  }

  return value
}

function getPanelText(lang: string) {
  if (lang === 'en') {
    return {
      cpu: 'CPU',
      architecture: 'Architecture',
      virtualization: 'Virtualization',
      gpu: 'GPU',
      operatingSystem: 'Operating System',
      kernel: 'Kernel',
      network: 'Network',
      totalTraffic: 'Total Traffic',
      memory: 'Memory',
      swap: 'Swap',
      disk: 'Disk',
      runningTime: 'Running Time',
      lastReport: 'Last Report',
    }
  }

  if (lang === 'zh-TW') {
    return {
      cpu: 'CPU',
      architecture: '架構',
      virtualization: '虛擬化',
      gpu: 'GPU',
      operatingSystem: '作業系統',
      kernel: '核心版本',
      network: '網路',
      totalTraffic: '總流量',
      memory: '記憶體',
      swap: '交換',
      disk: '磁碟',
      runningTime: '運行時間',
      lastReport: '最後上報',
    }
  }

  return {
    cpu: 'CPU',
    architecture: '架构',
    virtualization: '虚拟化',
    gpu: 'GPU',
    operatingSystem: '操作系统',
    kernel: '内核版本',
    network: '网络',
    totalTraffic: '总流量',
    memory: '内存',
    swap: '交换',
    disk: '磁盘',
    runningTime: '运行时间',
    lastReport: '最后上报',
  }
}

function InfoCard({
  label,
  value,
  sub,
  icon,
  className = '',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        'min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 shadow-xl shadow-black/20 backdrop-blur-xl',
        className,
      ].join(' ')}
    >
      <div className="mb-3 flex min-w-0 items-center gap-2 text-sm text-zinc-400">
        {icon && <span className="shrink-0 text-emerald-400">{icon}</span>}
        <span className="min-w-0 truncate">{label}</span>
      </div>

      <div className="min-w-0 break-words text-base font-semibold leading-relaxed text-zinc-100">
        {value}
      </div>

      {sub && (
        <div className="mt-1 min-w-0 break-words text-sm text-zinc-500">
          {sub}
        </div>
      )}
    </div>
  )
}

export function SystemInfoPanel({ node }: { node: NodeItem }) {
  const { lang } = useI18n()
  const text = getPanelText(lang)

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
      <InfoCard
        label={text.cpu}
        value={node.system.cpuModel}
        sub={node.system.cores}
        icon={<Cpu className="h-5 w-5" />}
        className="md:col-span-2"
      />

      <InfoCard
        label={text.architecture}
        value={node.system.arch}
        icon={<Server className="h-5 w-5" />}
      />

      <InfoCard
        label={text.virtualization}
        value={node.system.virtualization}
        icon={<Database className="h-5 w-5" />}
      />

      <InfoCard
        label={text.gpu}
        value={node.system.gpu}
        icon={<Monitor className="h-5 w-5" />}
      />

      <InfoCard
        label={text.operatingSystem}
        value={node.system.os}
        sub={`${text.kernel}: ${node.system.kernel}`}
        icon={<Server className="h-5 w-5" />}
      />

      <InfoCard
        label={text.network}
        value={
          <div className="space-y-1">
            <div className="text-emerald-400">↑ {node.uploadSpeed}</div>
            <div className="text-sky-400">↓ {node.downloadSpeed}</div>
          </div>
        }
        icon={<Network className="h-5 w-5" />}
      />

      <InfoCard
        label={text.totalTraffic}
        value={
          <div className="space-y-1">
            <div className="text-emerald-400">↑ {node.totalUpload}</div>
            <div className="text-sky-400">↓ {node.totalDownload}</div>
          </div>
        }
        icon={<Database className="h-5 w-5" />}
      />

      <InfoCard
        label={text.memory}
        value={node.system.memory}
        icon={<MemoryStick className="h-5 w-5" />}
      />

      <InfoCard
        label={text.swap}
        value={node.system.swap}
        icon={<MemoryStick className="h-5 w-5" />}
      />

      <InfoCard
        label={text.disk}
        value={node.system.disk}
        icon={<HardDrive className="h-5 w-5" />}
      />

      <InfoCard
        label={text.runningTime}
        value={localizeDuration(node.system.runningTime, lang)}
        className="md:col-span-2"
      />

      <InfoCard
        label={text.lastReport}
        value={node.system.lastReport}
        className="md:col-span-2"
      />
    </div>
  )
}
