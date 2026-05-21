import { Outlet } from 'react-router-dom';
import FloatingAssistant from '../assistant/FloatingAssistant';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { TenantBrandingProvider } from '../../contexts/TenantBrandingContext';

function AppShell() {
  return (
    <div
      className="flex h-screen overflow-hidden selection:bg-[var(--app-accent)]/20"
      style={{
        background: 'linear-gradient(180deg, rgba(255, 250, 242, 0.98) 0%, rgba(245, 240, 232, 1) 24%, rgba(239, 230, 220, 0.96) 100%)',
        color: 'var(--app-ink)',
      }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            <Outlet />
          </div>
        </main>
        <FloatingAssistant />
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <TenantBrandingProvider>
      <AppShell />
    </TenantBrandingProvider>
  );
}

