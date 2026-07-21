import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useAuthStore } from '@/store/authStore'

const titles: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/products': 'Products',
  '/app/customers': 'Customers',
  '/app/knowledge': 'Knowledge',
  '/app/leads': 'Leads',
  '/app/chat': 'Chat (admin)',
  '/app/quotations': 'Quotations',
  '/app/users': 'Sales Users',
}

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  let pageTitle = titles[location.pathname] ?? 'SalesMind AI'
  if (location.pathname === '/app/leads' && user?.role === 'sales') pageTitle = 'My Leads'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="z-10 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-[#F4F3F1] px-5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-faint">SalesMind AI</span>
        <Icon name="chevRight" size={12} className="text-[#D0CEC9]" />
        <span className="text-xs font-semibold text-text">{pageTitle}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-[11px] font-semibold text-text">Demo siap</span>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text"
      >
        <Icon name="logout" size={12} />
        Keluar
      </button>

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF4FF] text-[10px] font-bold text-text">
        {(user?.name ?? 'AD').slice(0, 2).toUpperCase()}
      </div>
    </div>
  )
}
