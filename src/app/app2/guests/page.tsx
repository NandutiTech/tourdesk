'use client'
import { Toolbar, EmptyState } from '@/components/ui'

export default function Page() {
  return (
    <div style={{ padding: '0 0 100px' }}>
      <Toolbar title="Coming soon" />
      <div style={{ padding: '0 16px' }}>
        <EmptyState icon="🚧" title="In development" sub="This feature is being built. Check back soon!" />
      </div>
    </div>
  )
}
