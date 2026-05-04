import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { TenantBrandingProvider, useTenantBranding } from '../../contexts/TenantBrandingContext';

function AppShell() {
  const { parlourBrand, isTenantBranded } = useTenantBranding();

  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 selection:bg-red-500/20"
      style={isTenantBranded ? { background: `linear-gradient(180deg, ${parlourBrand?.primaryColor ?? '#f8fafc'}14 0%, #f8fafc 18%)` } : undefined}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            <Outlet />
          </div>
        </main>
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

