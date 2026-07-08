import { NavLink, Outlet } from 'react-router-dom';
import { useApi } from '../api.js';
import { Pill } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Store health', icon: '◫' },
  { to: '/research', label: 'Product research', icon: '⌕' },
  { to: '/ads', label: 'Ad performance', icon: '◔' },
  { to: '/signals', label: 'Scaling signals', icon: '⇗' },
  { to: '/automations', label: 'Automations', icon: '⚙' },
  { to: '/finance', label: 'Finance', icon: '$' },
  { to: '/settings', label: 'Settings', icon: '≡' },
];

export function Layout() {
  const { data: health } = useApi('/health', { intervalMs: 120_000 });
  const { data: alertsData } = useApi('/alerts', { intervalMs: 60_000 });
  const openAlerts = alertsData?.alerts?.length ?? 0;
  const critical = alertsData?.alerts?.filter((a) => a.severity === 'critical').length ?? 0;
  const mockCount = health ? Object.values(health.integrations).filter((m) => m === 'mock').length : 0;

  return (
    <div className="min-h-screen bg-page flex">
      <aside className="w-56 shrink-0 border-r border-edge px-3 py-5 flex flex-col gap-6 sticky top-0 h-screen">
        <div className="px-2">
          <p className="text-[15px] font-bold text-ink tracking-tight">DropshipOS</p>
          <p className="text-[11px] text-muted mt-0.5">Automation command center</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-raised text-ink font-medium' : 'text-ink2 hover:bg-raised/60'
                }`
              }
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true" className="text-muted w-4 text-center">{item.icon}</span>
                {item.label}
              </span>
              {item.to === '/signals' && openAlerts > 0 && (
                <span
                  className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                    critical > 0 ? 'bg-critical text-white' : 'bg-raised border border-edge text-ink2'
                  }`}
                >
                  {openAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 space-y-2">
          {health && (
            <Pill tone={mockCount === 0 ? 'green' : 'amber'}>
              {mockCount === 0 ? 'All integrations live' : `${mockCount} integration${mockCount > 1 ? 's' : ''} in demo mode`}
            </Pill>
          )}
          <p className="text-[10px] text-muted leading-relaxed">
            Demo mode simulates realistic store data until API keys are added in <code>server/.env</code>.
          </p>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-6 py-6 max-w-[1400px]">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
