import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useAuthStore } from '@/store/authStore'

type Role = 'admin' | 'sales'

type NavItem = { to: string; label: string; salesLabel?: string; roles: Role[] }

const NAV: NavItem[] = [
  { to: '/app', label: 'Ringkasan', roles: ['admin', 'sales'] },
  { to: '/app/leads', label: 'Leads', salesLabel: 'Lead saya', roles: ['admin', 'sales'] },
  { to: '/app/quotations', label: 'Penawaran', roles: ['admin', 'sales'] },
  { to: '/app/products', label: 'Produk', roles: ['admin', 'sales'] },
  { to: '/app/customers', label: 'Pelanggan', roles: ['admin'] },
  { to: '/app/knowledge', label: 'Knowledge', roles: ['admin'] },
  { to: '/app/users', label: 'Pengguna', roles: ['admin'] },
  { to: '/app/chat', label: 'Uji chat', roles: ['admin'] },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const role: Role = user?.role === 'sales' ? 'sales' : 'admin'
  const items = NAV.filter((n) => n.roles.includes(role)).map((n) => ({
    ...n,
    label: role === 'sales' && n.salesLabel ? n.salesLabel : n.label,
  }))

  useEffect(() => {
    const current = NAV.find((n) => n.to === pathname)
    const label = role === 'sales' && current?.salesLabel ? current.salesLabel : current?.label
    document.title = `${label ?? 'Console'}, SalesMind console`
  }, [pathname, role])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="ds-page min-h-full bg-bg text-text">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-[8px] focus:bg-[#D6E56A] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#121410]"
      >
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-30 bg-[#121410] text-[#F4F3F1] shadow-[0_1px_0_rgba(255,255,255,0.06),0_12px_30px_-20px_rgba(18,20,16,0.7)]">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 px-5 lg:flex-nowrap lg:px-8">
          <Link to="/app" className="flex h-14 shrink-0 items-center gap-2.5 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6E56A]">
            <span aria-hidden className="h-2.5 w-2.5 bg-[#D6E56A]" />
            <span className="text-[15px] font-bold tracking-tight">SalesMind</span>
            <span className="font-mono text-[11.5px] text-white/45">console</span>
          </Link>

          <nav
            aria-label="Menu console"
            className="order-last -mx-5 flex w-[calc(100%+2.5rem)] gap-1 overflow-x-auto border-t border-white/[0.07] px-4 py-2 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:flex-1 lg:border-0 lg:px-0 lg:py-0"
          >
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  `inline-flex h-8 shrink-0 items-center rounded-[8px] px-3 text-[13.5px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6E56A] ${
                    isActive
                      ? 'bg-[#D6E56A] font-semibold text-[#121410]'
                      : 'font-medium text-white/60 hover:bg-white/[0.07] hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex h-14 shrink-0 items-center gap-1.5 lg:ml-0">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium text-white/60 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6E56A] sm:inline-flex"
            >
              Buka toko
              <Icon name="external" size={13} />
            </a>
            <span aria-hidden className="mx-1.5 hidden h-5 w-px bg-white/10 sm:block" />
            <div className="flex items-center gap-2.5 pr-1">
              <span
                title={`${user?.name ?? 'Pengguna'}, ${role}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/[0.08] font-mono text-[11px] font-semibold"
              >
                {(user?.name ?? 'Admin')
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <span className="hidden min-w-0 leading-tight max-lg:sm:block 2xl:block">
                <span className="block max-w-[140px] truncate text-[13px] font-semibold">{user?.name ?? 'Pengguna'}</span>
                <span className="block font-mono text-[11px] text-white/45">{role}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium text-white/60 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6E56A] active:translate-y-px"
            >
              <Icon name="logout" size={14} />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-8 outline-none lg:px-8 lg:pt-10">
        <div key={pathname} className="console-rise">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
