import { Outlet, useLocation } from 'react-router-dom';
import FloatingAssistant from '../assistant/FloatingAssistant';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { TenantBrandingProvider } from '../../contexts/TenantBrandingContext';
import { useEffect, useState } from 'react';

function AppShell() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen overflow-x-hidden selection:bg-[var(--app-accent)]/20 md:h-screen"
      style={{
        background: 'linear-gradient(180deg, rgba(255, 250, 242, 0.98) 0%, rgba(245, 240, 232, 1) 24%, rgba(239, 230, 220, 0.96) 100%)',
        color: 'var(--app-ink)',
      }}
    >
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="relative z-10 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="mx-auto w-full max-w-7xl animate-fade-in-up">
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

