export type NodeStatus = 'online' | 'partial' | 'offline'

export type NodeMetricSample = {
  timestamp: number
  time: string
  cpu: number
  memory: number
  disk: number
  uploadSpeed: number
  downloadSpeed: number
  totalUpload: number
  totalDownload: number
  connections: number
  udpConnections: number
  processes: number
}

export type LatencyTarget = {
  id: string
  name: string
  color: string
  latestMs: number
  loss: number
  jitter: number
  series: {
    time: string
    value: number
  }[]
}

export type NodeItem = {
  id: string
  name: string
  region: string
  countryCode: string
  country: string

  cpu: number
  memory: number
  disk: number
  ping: number

  uptime: string
  traffic24h: string
  trafficUsed?: string
  trafficLimit?: string
  trafficLimitBytes?: number
  uploadSpeed: string
  downloadSpeed: string
  totalUpload: string
  totalDownload: string

  change: number
  status: NodeStatus

  latencyTargets: LatencyTarget[]
  history?: NodeMetricSample[]

  tags?: string
  group?: string
  publicRemark?: string
  billing?: {
    price: number
    currency: string
    billingCycle: number
    expiredAt: string
    autoRenewal: boolean
  }

  system: {
    cpuModel: string
    cores: string
    arch: string
    virtualization: string
    gpu: string
    os: string
    kernel: string
    memory: string
    swap: string
    disk: string
    runningTime: string
    lastReport: string
  }
}

function buildLatencySeries(
  base: number,
  wobble: number,
  spikeIndexes: number[] = [],
  spikeBoost = 0,
) {
  const labels = [
    '17:20',
    '17:25',
    '17:30',
    '17:35',
    '17:40',
    '17:45',
    '17:50',
    '17:55',
    '18:00',
    '18:05',
    '18:10',
    '18:15',
    '18:20',
    '18:25',
    '18:30',
    '18:35',
    '18:40',
    '18:45',
    '18:50',
    '18:55',
    '19:00',
    '19:05',
    '19:10',
    '19:15',
  ]

  return labels.map((time, index) => {
    let value =
      base +
      Math.sin(index / 1.8) * wobble +
      Math.cos(index / 2.6) * wobble * 0.55 +
      (index % 5 === 0 ? wobble * 0.35 : 0)

    if (spikeIndexes.includes(index)) {
      value += spikeBoost
    }

    return {
      time,
      value: Number(Math.max(5, value).toFixed(1)),
    }
  })
}

function buildMetricHistory({
  cpu,
  memory,
  disk,
  uploadSpeed,
  downloadSpeed,
  totalUpload,
  totalDownload,
  connections,
  udpConnections,
  processes,
}: {
  cpu: number
  memory: number
  disk: number
  uploadSpeed: number
  downloadSpeed: number
  totalUpload: number
  totalDownload: number
  connections: number
  udpConnections: number
  processes: number
}): NodeMetricSample[] {
  const now = Date.now()
  const points = 36

  return Array.from({ length: points }, (_, index) => {
    const timestamp = now - (points - index - 1) * 5 * 60 * 1000
    const wave = Math.sin(index / 3) * 0.15 + Math.cos(index / 5) * 0.08

    return {
      timestamp,
      time: new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      cpu: Number(Math.max(0, Math.min(100, cpu + cpu * wave)).toFixed(2)),
      memory: Number(Math.max(0, Math.min(100, memory + memory * wave * 0.35)).toFixed(2)),
      disk: Number(Math.max(0, Math.min(100, disk + disk * wave * 0.12)).toFixed(2)),
      uploadSpeed: Math.max(0, Math.round(uploadSpeed + uploadSpeed * wave)),
      downloadSpeed: Math.max(0, Math.round(downloadSpeed + downloadSpeed * wave)),
      totalUpload,
      totalDownload,
      connections: Math.max(0, Math.round(connections + connections * wave * 0.35)),
      udpConnections: Math.max(0, Math.round(udpConnections + udpConnections * wave * 0.25)),
      processes: Math.max(0, Math.round(processes + processes * wave * 0.12)),
    }
  })
}

export const nodes: NodeItem[] = [
  {
    id: 'hkt-home',
    name: 'HKT Home',
    region: 'Hong Kong',
    countryCode: 'HK',
    country: 'China',
    cpu: 18,
    memory: 42,
    disk: 67,
    ping: 14,
    uptime: '99.98%',
    traffic24h: '1.26 TB',
    uploadSpeed: '8.01 KB/s',
    downloadSpeed: '4.15 KB/s',
    totalUpload: '258.4 MB',
    totalDownload: '2.41 GB',
    change: -6,
    status: 'online',
    tags: '家宽 PCCW',
    group: '香港',
    publicRemark: '主力入口节点',
    billing: {
      price: 68,
      currency: '¥',
      billingCycle: 30,
      expiredAt: '2026-06-30T00:00:00Z',
      autoRenewal: false,
    },
    history: buildMetricHistory({
      cpu: 18,
      memory: 42,
      disk: 67,
      uploadSpeed: 8200,
      downloadSpeed: 4200,
      totalUpload: 270951014,
      totalDownload: 2587715993,
      connections: 196,
      udpConnections: 77,
      processes: 460,
    }),
    latencyTargets: [
      {
        id: 'liaoning-telecom',
        name: '辽宁电信',
        color: '#f87171',
        latestMs: 58,
        loss: 0,
        jitter: 0.2,
        series: buildLatencySeries(58, 6),
      },
      {
        id: 'liaoning-unicom',
        name: '辽宁联通',
        color: '#22c55e',
        latestMs: 73,
        loss: 0,
        jitter: 0.3,
        series: buildLatencySeries(73, 7),
      },
      {
        id: 'liaoning-mobile',
        name: '辽宁移动',
        color: '#818cf8',
        latestMs: 54,
        loss: 0,
        jitter: 0.2,
        series: buildLatencySeries(54, 5),
      },
      {
        id: 'jiangsu-telecom',
        name: '江苏电信',
        color: '#06b6d4',
        latestMs: 28,
        loss: 0,
        jitter: 0.2,
        series: buildLatencySeries(28, 4),
      },
      {
        id: 'jiangsu-unicom',
        name: '江苏联通',
        color: '#67e8f9',
        latestMs: 27,
        loss: 0,
        jitter: 0.0,
        series: buildLatencySeries(27, 3),
      },
      {
        id: 'guangdong-mobile',
        name: '广东移动',
        color: '#fb7185',
        latestMs: 72,
        loss: 0,
        jitter: 0.2,
        series: buildLatencySeries(72, 7),
      },
      {
        id: 'tokyo-akamai',
        name: '东京-Akamai',
        color: '#2e7d32',
        latestMs: 214,
        loss: 0,
        jitter: 4.3,
        series: buildLatencySeries(214, 28, [4, 12], 160),
      },
      {
        id: 'la-akamai',
        name: '洛杉矶-Akamai',
        color: '#7c83fd',
        latestMs: 302,
        loss: 0,
        jitter: 0.3,
        series: buildLatencySeries(295, 12),
      },
      {
        id: 'france-akamai',
        name: '法兰克福-Akamai',
        color: '#14b8a6',
        latestMs: 228,
        loss: 0,
        jitter: 1.1,
        series: buildLatencySeries(228, 16),
      },
      {
        id: 'hongkong-akamai',
        name: '香港-Akamai',
        color: '#7dd3fc',
        latestMs: 8,
        loss: 100,
        jitter: 0.0,
        series: buildLatencySeries(8, 2),
      },
    ],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '5天 21 时 19 分 16 秒',
      lastReport: '2026/5/10 13:22:48',
    },
  },
  {
    id: 'tokyo-edge',
    name: 'Tokyo Edge',
    region: 'Tokyo',
    countryCode: 'JP',
    country: 'Japan',
    cpu: 24,
    memory: 38,
    disk: 51,
    ping: 38,
    uptime: '99.92%',
    traffic24h: '820 GB',
    uploadSpeed: '1.20 MB/s',
    downloadSpeed: '4.82 MB/s',
    totalUpload: '411.8 GB',
    totalDownload: '1.36 TB',
    change: -3,
    status: 'online',
    tags: 'SoftBank',
    group: '日本',
    publicRemark: '东京边缘节点',
    billing: {
      price: 11.1,
      currency: '$',
      billingCycle: 30,
      expiredAt: '2026-07-10T00:00:00Z',
      autoRenewal: true,
    },
    history: buildMetricHistory({
      cpu: 24,
      memory: 38,
      disk: 51,
      uploadSpeed: 1258291,
      downloadSpeed: 5054136,
      totalUpload: 442167623680,
      totalDownload: 1495335813775,
      connections: 184,
      udpConnections: 62,
      processes: 438,
    }),
    latencyTargets: [],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '9天 08 时 12 分 42 秒',
      lastReport: '2026/5/10 13:22:51',
    },
  },
  {
    id: 'singapore-hub',
    name: 'Singapore Hub',
    region: 'Singapore',
    countryCode: 'SG',
    country: 'Singapore',
    cpu: 32,
    memory: 48,
    disk: 58,
    ping: 46,
    uptime: '99.90%',
    traffic24h: '640 GB',
    uploadSpeed: '820 KB/s',
    downloadSpeed: '2.14 MB/s',
    totalUpload: '190.2 GB',
    totalDownload: '870.5 GB',
    change: -2,
    status: 'online',
    tags: '直连',
    group: '新加坡',
    publicRemark: '',
    billing: {
      price: 0,
      currency: '',
      billingCycle: 0,
      expiredAt: '',
      autoRenewal: false,
    },
    history: buildMetricHistory({
      cpu: 32,
      memory: 48,
      disk: 58,
      uploadSpeed: 839680,
      downloadSpeed: 2243952,
      totalUpload: 204225282048,
      totalDownload: 934691741696,
      connections: 156,
      udpConnections: 51,
      processes: 421,
    }),
    latencyTargets: [],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '12天 03 时 28 分 09 秒',
      lastReport: '2026/5/10 13:22:50',
    },
  },
  {
    id: 'us-west',
    name: 'US West',
    region: 'Oregon',
    countryCode: 'US',
    country: 'United States of America',
    cpu: 42,
    memory: 55,
    disk: 62,
    ping: 126,
    uptime: '99.86%',
    traffic24h: '512 GB',
    uploadSpeed: '620 KB/s',
    downloadSpeed: '1.56 MB/s',
    totalUpload: '98.6 GB',
    totalDownload: '530.2 GB',
    change: -4,
    status: 'online',
    tags: '洛杉矶',
    group: '美国',
    publicRemark: '备用出口',
    billing: {
      price: 8.5,
      currency: '$',
      billingCycle: 30,
      expiredAt: '2026-08-01T00:00:00Z',
      autoRenewal: false,
    },
    history: buildMetricHistory({
      cpu: 42,
      memory: 55,
      disk: 62,
      uploadSpeed: 634880,
      downloadSpeed: 1635779,
      totalUpload: 105871081062,
      totalDownload: 569297480499,
      connections: 132,
      udpConnections: 48,
      processes: 396,
    }),
    latencyTargets: [],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '18天 11 时 07 分 35 秒',
      lastReport: '2026/5/10 13:22:49',
    },
  },
  {
    id: 'us-east',
    name: 'US East',
    region: 'Virginia',
    countryCode: 'US',
    country: 'United States of America',
    cpu: 67,
    memory: 71,
    disk: 80,
    ping: 138,
    uptime: '98.77%',
    traffic24h: '392 GB',
    uploadSpeed: '210 KB/s',
    downloadSpeed: '930 KB/s',
    totalUpload: '76.2 GB',
    totalDownload: '410.7 GB',
    change: 8,
    status: 'offline',
    tags: 'BGP',
    group: '美国',
    publicRemark: '临时维护',
    billing: {
      price: 12,
      currency: '$',
      billingCycle: 30,
      expiredAt: '2026-05-20T00:00:00Z',
      autoRenewal: false,
    },
    history: buildMetricHistory({
      cpu: 67,
      memory: 71,
      disk: 80,
      uploadSpeed: 215040,
      downloadSpeed: 952320,
      totalUpload: 81834198630,
      totalDownload: 441018880819,
      connections: 98,
      udpConnections: 31,
      processes: 388,
    }),
    latencyTargets: [],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '5天 21 时 19 分 16 秒',
      lastReport: '2026/5/10 13:22:48',
    },
  },
  {
    id: 'frankfurt',
    name: 'Frankfurt',
    region: 'Frankfurt',
    countryCode: 'DE',
    country: 'Germany',
    cpu: 58,
    memory: 64,
    disk: 73,
    ping: 188,
    uptime: '99.12%',
    traffic24h: '288 GB',
    uploadSpeed: '180 KB/s',
    downloadSpeed: '770 KB/s',
    totalUpload: '54.1 GB',
    totalDownload: '260.9 GB',
    change: 6,
    status: 'offline',
    tags: 'V6',
    group: '德国',
    publicRemark: '',
    billing: {
      price: 5,
      currency: '€',
      billingCycle: 30,
      expiredAt: '2026-06-15T00:00:00Z',
      autoRenewal: true,
    },
    history: buildMetricHistory({
      cpu: 58,
      memory: 64,
      disk: 73,
      uploadSpeed: 184320,
      downloadSpeed: 788480,
      totalUpload: 58082032189,
      totalDownload: 280138638950,
      connections: 87,
      udpConnections: 29,
      processes: 344,
    }),
    latencyTargets: [],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '7天 02 时 42 分 18 秒',
      lastReport: '2026/5/10 13:22:47',
    },
  },
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    region: 'São Paulo',
    countryCode: 'BR',
    country: 'Brazil',
    cpu: 61,
    memory: 69,
    disk: 75,
    ping: 242,
    uptime: '98.96%',
    traffic24h: '186 GB',
    uploadSpeed: '98 KB/s',
    downloadSpeed: '410 KB/s',
    totalUpload: '33.8 GB',
    totalDownload: '188.2 GB',
    change: 7,
    status: 'offline',
    tags: '远程',
    group: '巴西',
    publicRemark: '',
    billing: {
      price: 6.5,
      currency: '$',
      billingCycle: 30,
      expiredAt: '2026-07-01T00:00:00Z',
      autoRenewal: false,
    },
    history: buildMetricHistory({
      cpu: 61,
      memory: 69,
      disk: 75,
      uploadSpeed: 100352,
      downloadSpeed: 419840,
      totalUpload: 36292483481,
      totalDownload: 202078532403,
      connections: 75,
      udpConnections: 21,
      processes: 312,
    }),
    latencyTargets: [],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '4天 16 时 31 分 25 秒',
      lastReport: '2026/5/10 13:22:44',
    },
  },
  {
    id: 'sydney',
    name: 'Sydney',
    region: 'Sydney',
    countryCode: 'AU',
    country: 'Australia',
    cpu: 21,
    memory: 36,
    disk: 49,
    ping: 166,
    uptime: '99.95%',
    traffic24h: '438 GB',
    uploadSpeed: '480 KB/s',
    downloadSpeed: '1.22 MB/s',
    totalUpload: '120.4 GB',
    totalDownload: '620.7 GB',
    change: -2,
    status: 'online',
    tags: 'AUS',
    group: '澳洲',
    publicRemark: '测试节点',
    billing: {
      price: 7,
      currency: '$',
      billingCycle: 30,
      expiredAt: '2026-09-01T00:00:00Z',
      autoRenewal: false,
    },
    history: buildMetricHistory({
      cpu: 21,
      memory: 36,
      disk: 49,
      uploadSpeed: 491520,
      downloadSpeed: 1279262,
      totalUpload: 129278515610,
      totalDownload: 666466942566,
      connections: 116,
      udpConnections: 42,
      processes: 372,
    }),
    latencyTargets: [],
    system: {
      cpuModel: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
      cores: '2 Cores',
      arch: 'amd64',
      virtualization: 'kvm',
      gpu: 'None',
      os: 'Ubuntu 22.04.5 LTS',
      kernel: '5.15.0-177-generic',
      memory: '1.92 GB',
      swap: '0 B',
      disk: '9.61 GB',
      runningTime: '15天 09 时 46 分 03 秒',
      lastReport: '2026/5/10 13:22:46',
    },
  },
]
