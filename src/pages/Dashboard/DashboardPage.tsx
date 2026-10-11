import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Badge,
  EmptyState,
  LEAD_STATUS,
  Mono,
  Notice,
  PageHeader,
  Panel,
  PanelBar,
  SkeletonRows,
  leadStatus,
} from '@/components/console/kit'
import { Icon } from '@/components/ui/Icon'
import { formatRelative } from '@/lib/format'
import { fetchLeads } from '@/services/leadService'
import { fetchDashboardStats } from '@/services/productService'
import { useAuthStore } from '@/store/authStore'

const STATUS_FILL: Record<string, string> = {
  new: 'bg-[#D6E56A]',
  qualified: 'bg-[#121410]/35',
  won: 'bg-[#121410]',
  lost: 'bg-danger/70',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 19) return 'Selamat sore'
  return 'Selamat malam'
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const displayName = user?.name?.trim() || 'tim'

  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: fetchLeads })
  const leads = leadsQuery.data ?? []

  const recent = [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
  const counts = LEAD_STATUS.map((s) => ({ ...s, n: leads.filter((l) => l.status === s.value).length }))
  const total = leads.length

  const tiles = [
    { label: isAdmin ? 'Lead' : 'Lead saya', value: isAdmin ? stats.data?.leads : total, to: '/app/leads' },
    { label: 'Pelanggan', value: stats.data?.customers, to: isAdmin ? '/app/customers' : null },
    { label: 'Produk di katalog', value: stats.data?.products, to: '/app/products' },
    { label: 'Percakapan AI', value: stats.data?.conversations, to: isAdmin ? '/app/chat' : null },
  ]

  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(),
  )

  return (
    <>
      <PageHeader
        meta={today}
        title={`${greeting()}, ${displayName}`}
        description={
          isAdmin
            ? 'Ringkasan katalog, pelanggan, dan lead yang masuk dari chat di landing.'
            : 'Lead yang ditugaskan ke kamu dan langkah berikutnya.'
        }
        action={
          <Link
            to="/app/leads"
            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#121410] px-4 text-[13.5px] font-semibold text-white transition-colors duration-200 hover:bg-ink-hover active:translate-y-px"
          >
            Buka leads
            <Icon name="arrowRight" size={15} stroke={2} />
          </Link>
        }
      />

      {stats.isError ? (
        <Notice>
          Statistik gagal dimuat: {stats.error instanceof Error ? stats.error.message : 'server tidak merespons'}.
        </Notice>
      ) : null}

      <Panel className="grid grid-cols-2 overflow-hidden lg:grid-cols-4">
        {tiles.map((t, i) => {
          const body = (
            <>
              <span className="text-[13px] text-muted">{t.label}</span>
              <Mono className="mt-3 block text-[36px] font-semibold leading-none tracking-tight text-text">
                {stats.isLoading ? <span className="console-skeleton inline-block h-8 w-14 rounded-[8px] align-middle" /> : stats.isError ? '-' : (t.value ?? 0)}
              </Mono>
              {t.to ? (
                <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-muted transition-colors duration-200 group-hover:text-text">
                  Lihat
                  <Icon name="arrowRight" size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              ) : (
                <span className="mt-4 block text-[12.5px] text-faint">Hanya admin</span>
              )}
            </>
          )
          const cell = `group block px-5 pb-5 pt-5 sm:px-6 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${
            i === 2 ? 'lg:border-l' : ''
          } border-[#121410]/[0.07]`
          return t.to ? (
            <Link key={t.label} to={t.to} className={`${cell} transition-colors duration-200 hover:bg-[#D6E56A]/[0.14]`}>
              {body}
            </Link>
          ) : (
            <div key={t.label} className={cell}>
              {body}
            </div>
          )
        })}
      </Panel>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel>
          <PanelBar className="justify-between">
            <h2 className="text-[15px] font-semibold">Lead terbaru</h2>
            {total ? (
              <Link to="/app/leads" className="text-[13px] font-medium text-muted hover:text-text hover:underline">
                Semua <Mono>{total}</Mono> lead
              </Link>
            ) : null}
          </PanelBar>
          {leadsQuery.isLoading ? (
            <SkeletonRows rows={4} cols={3} />
          ) : leadsQuery.isError ? (
            <EmptyState title="Lead gagal dimuat">Muat ulang halaman. Kalau masih gagal, cek apakah backend berjalan di port 8000.</EmptyState>
          ) : recent.length === 0 ? (
            <EmptyState
              title="Belum ada lead masuk"
              action={
                <>
                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#D6E56A] px-4 text-[13.5px] font-semibold text-[#121410] shadow-[inset_0_0_0_1px_rgba(18,20,16,0.12)] transition-[filter] duration-200 hover:brightness-95"
                  >
                    Coba chat di landing
                    <Icon name="external" size={14} />
                  </a>
                  <Link
                    to="/app/leads?baru=1"
                    className="inline-flex h-9 items-center rounded-[8px] px-3 text-[13.5px] font-semibold text-text transition-colors duration-200 hover:bg-[#121410]/[0.05]"
                  >
                    Tambah lead manual
                  </Link>
                </>
              }
            >
              {isAdmin
                ? 'Lead dibuat otomatis saat pengunjung landing bilang tertarik dan mengisi nama serta WhatsApp. Kamu juga bisa menambahkannya manual.'
                : 'Lead muncul di sini setelah admin atau sistem menugaskannya ke kamu.'}
            </EmptyState>
          ) : (
            <ul>
              {recent.map((lead) => {
                const s = leadStatus(lead.status)
                return (
                  <li key={lead.id} className="border-t border-[#121410]/[0.06] first:border-t-0">
                    <Link
                      to="/app/leads"
                      className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-[#D6E56A]/[0.12]"
                    >
                      <Avatar name={lead.customer_name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{lead.customer_name}</span>
                        <span className="block truncate text-[12.5px] text-muted">{lead.product_name || 'Belum ada produk minat'}</span>
                      </span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                      <Mono className="hidden w-24 text-right text-[12px] text-muted sm:block">{formatRelative(lead.created_at)}</Mono>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Pipeline</h2>
              <Mono className="text-[12px] text-muted">{total} lead</Mono>
            </div>
            <div
              className="mt-4 flex h-3 overflow-hidden rounded-[8px] bg-[#121410]/[0.06]"
              role="img"
              aria-label={counts.map((c) => `${c.label} ${c.n}`).join(', ')}
            >
              {total
                ? counts.map((c) =>
                    c.n ? <span key={c.value} className={STATUS_FILL[c.value]} style={{ width: `${(c.n / total) * 100}%` }} /> : null,
                  )
                : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {counts.map((c) => (
                <div key={c.value} className="flex items-center justify-between gap-3 text-[13.5px]">
                  <dt className="flex items-center gap-2 text-muted">
                    <span aria-hidden className={`h-2.5 w-2.5 ${STATUS_FILL[c.value]}`} />
                    {c.label}
                  </dt>
                  <dd>
                    <Mono className="font-semibold">{c.n}</Mono>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold">Alur lead</h2>
            <ol className="mt-4 space-y-3.5">
              {[
                'Pengunjung chat dengan AI di landing, lalu bilang tertarik.',
                'Sistem membuat lead dan membaginya ke sales yang menerima lead.',
                'Sales mengubah status dan catatan setelah menghubungi lewat WhatsApp.',
                'Penawaran PDF dibuat langsung dari baris lead.',
              ].map((step, i) => (
                <li key={step} className="grid grid-cols-[24px_1fr] gap-2 text-[13.5px] leading-relaxed">
                  <span aria-hidden className="pt-px font-mono text-[12px] text-muted">{`0${i + 1}`}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  )
}
