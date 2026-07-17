import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useAuthStore } from '@/store/authStore'

const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: '/app', label: 'Dashboard', icon: 'home' },
  { to: '/app/chat', label: 'Chat AI', icon: 'chat' },
  { to: '/app/products', label: 'Products', icon: 'box' },
  { to: '/app/customers', label: 'Customers', icon: 'users' },
  { to: '/app/knowledge', label: 'Knowledge', icon: 'book' },
  { to: '/app/leads', label: 'Leads', icon: 'funnel' },
  { to: '/app/quotations', label: 'Quotations', icon: 'doc' },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="flex w-[188px] shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar">
      <div className="border-b border-divider px-5 py-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-text">
            <Icon name="sparkles" size={15} stroke={2} className="text-highlight" />
          </div>
          <div>
            <div className="text-[13px] font-bold leading-tight text-text">SalesMind AI</div>
            <div className="text-[10px] font-medium text-faint">Prototype</div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-1.5 pt-3.5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-faint">Menu</div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) =>
              `flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[13px] transition ${
                isActive
                  ? 'bg-highlight font-semibold text-text'
                  : 'font-medium text-muted hover:bg-card'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={15} stroke={isActive ? 2 : 1.5} />
                <span className="flex-1">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-divider px-3.5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-[11px] font-bold text-text">
            {(user?.name ?? 'AD').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="truncate text-xs font-semibold text-text">{user?.name ?? 'Admin'}</div>
            <div className="text-[10px] text-faint">Administrator</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
