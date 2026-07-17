import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatRp } from '@/lib/format'
import { fetchDashboardStats } from '@/services/productService'

export function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const widgets = [
    { label: 'Total produk', value: data?.products },
    { label: 'Total customer', value: data?.customers },
    { label: 'Total lead', value: data?.leads },
    { label: 'Total percakapan', value: data?.conversations },
  ]

  const shortcuts = [
    { to: '/app/chat', title: 'Chat AI', desc: 'Rekomendasi laptop dari katalog' },
    { to: '/app/leads', title: 'Leads', desc: 'Pipeline new → qualified → won' },
    { to: '/app/quotations', title: 'Quotations', desc: 'Generate & unduh PDF Rupiah' },
    { to: '/app/products', title: 'Products', desc: 'Katalog ASUS (harga database)' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan SalesMind AI — katalog laptop ASUS & aktivitas sales (Bahasa Indonesia, Rp)."
      />

      {isError ? (
        <p className="mb-4 text-sm text-danger">
          Gagal memuat statistik: {error instanceof Error ? error.message : 'error'}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((w) => (
          <div key={w.label} className="rounded-[16px] border border-border bg-card p-4">
            <div className="text-xs font-medium text-faint">{w.label}</div>
            <div className="mt-2 text-2xl font-bold text-text">
              {isLoading ? '…' : isError ? '—' : (w.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="rounded-[16px] border border-border bg-card p-4 transition hover:border-brand"
          >
            <div className="text-sm font-bold text-text">{s.title}</div>
            <p className="mt-1 text-xs text-muted">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-[16px] border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-text">Alur demo singkat</h2>
        <p className="mt-2 text-sm text-muted">
          Chat (budget + kebutuhan) → rekomendasi dari database → lead CRM → quotation PDF. Contoh
          harga katalog: {formatRp(14_999_000)} (Vivobook S14 OLED).
        </p>
      </div>
    </div>
  )
}
