// src/app/(dashboard)/layout.tsx
// Dashboard layout: Sidebar + main content area

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s | Ajans Paneli', default: 'Ajans Paneli' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <Sidebar />
      <div style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <TopBar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
