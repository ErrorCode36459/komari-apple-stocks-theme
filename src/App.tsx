import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { OverviewPage } from './pages/OverviewPage'
import { NodePage } from './pages/NodePage'
import { useKomariData } from './hooks/useKomariData'

export default function App() {
  const { nodes } = useKomariData()

  const [searchQuery, setSearchQuery] = useState('')
  const [activePage, setActivePage] = useState<'overview' | 'node'>('overview')
  const [activeNodeId, setActiveNodeId] = useState('')
  const [nodePageKey, setNodePageKey] = useState(0)

  const activeNode = useMemo(() => {
    return nodes.find((node) => node.id === activeNodeId) ?? nodes[0]
  }, [nodes, activeNodeId])

  const handleOverviewClick = () => {
    setActivePage('overview')
    setActiveNodeId('')
  }

  const handleNodeClick = (id: string) => {
    setActiveNodeId(id)
    setActivePage('node')
    setNodePageKey((value) => value + 1)

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    })
  }

  const handleBackToOverview = () => {
    setActivePage('overview')
    setActiveNodeId('')

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    })
  }

  const mainContent =
    activePage === 'overview' ? (
      <OverviewPage />
    ) : activeNode ? (
      <NodePage
  key={`node-page-${activeNode.id}-${nodePageKey}`}
  nodeId={activeNode.id}
/>
    ) : (
      <OverviewPage />
    )

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#03070a] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_90%_18%,rgba(59,130,246,0.08),transparent_25%)]" />

      <div className="relative mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* 桌面布局 */}
        <div className="hidden min-w-0 gap-6 xl:flex">
          <Sidebar
            activePage={activePage}
            activeNodeId={activeNodeId}
            onOverviewClick={handleOverviewClick}
            onNodeClick={handleNodeClick}
            searchQuery={searchQuery}
          />

          <main className="min-w-0 flex-1">
            {mainContent}
          </main>
        </div>

        {/* 竖屏 / 窄屏布局 */}
        <div className="flex min-w-0 flex-col gap-5 xl:hidden">
          {activePage === 'node' ? (
            <>
              <button
                type="button"
                onClick={handleBackToOverview}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.045] px-4 py-2 text-sm font-medium text-zinc-300 shadow-lg shadow-black/20 transition hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
              </button>

              <main className="min-w-0">
                {mainContent}
              </main>
            </>
          ) : (
            <>
              <main className="min-w-0">
                {mainContent}
              </main>

              <Sidebar
                variant="mobileTop"
                activePage={activePage}
                activeNodeId={activeNodeId}
                onOverviewClick={handleOverviewClick}
                onNodeClick={handleNodeClick}
                searchQuery={searchQuery}
              />

              <Sidebar
                variant="watchlistOnly"
                activePage={activePage}
                activeNodeId={activeNodeId}
                onOverviewClick={handleOverviewClick}
                onNodeClick={handleNodeClick}
                searchQuery={searchQuery}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
