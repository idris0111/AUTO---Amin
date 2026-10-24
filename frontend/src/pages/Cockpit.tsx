import { lazy, Suspense } from 'react'

const ExecutiveCockpit = lazy(() => import('../components/cockpit/ExecutiveCockpit'))

export default function Cockpit() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b1326] flex items-center justify-center font-mono text-sm text-[#38bdf8]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-ping" />
            <span>Загрузка Executive Commerce Intelligence Cockpit...</span>
          </div>
        </div>
      }
    >
      <ExecutiveCockpit embedded={false} />
    </Suspense>
  )
}
