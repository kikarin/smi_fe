import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PublicChatWidget } from '@/components/chat/PublicChatWidget'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { formatRp } from '@/lib/format'
import { mediaUrl } from '@/services/api'
import { fetchPublicProducts } from '@/services/publicProductService'

const USAGE_OPTIONS = [
  { value: '', label: 'Semua kebutuhan' },
  { value: 'programming', label: 'Ngoding' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'editing', label: 'Editing' },
  { value: 'office', label: 'Kantor' },
  { value: 'mahasiswa', label: 'Kuliah' },
]

const EXAMPLE_QUESTIONS = [
  'Budget 14-21 juta, buat ngoding',
  'Laptop gaming di bawah 18 juta',
  'Halo, mau cari laptop untuk editing',
]

const PAGE_SIZE_OPTIONS = [8, 12, 24]

const HOW_IT_WORKS = [
  { n: '01', title: 'Ceritakan kebutuhanmu', body: 'Sebutkan budget dan aktivitas utama — ngoding, gaming, editing, atau kuliah.' },
  { n: '02', title: 'AI baca katalog real-time', body: 'Rekomendasi ditarik langsung dari database produk, bukan karangan.' },
  { n: '03', title: 'Lanjut ke sales bila perlu', body: 'Cocok? Isi Nama + WhatsApp. Butuh spek khusus? Chat sales langsung.' },
]

export function LandingPage() {
  const [usage, setUsage] = useState('')
  const [budgetMaxJt, setBudgetMaxJt] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [pageSize, setPageSize] = useState(12)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQ(searchInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [usage, budgetMaxJt, searchQ, pageSize])

  const query = useMemo(() => {
    const budget_max = budgetMaxJt ? Number(budgetMaxJt) * 1_000_000 : undefined
    return {
      usage: usage || undefined,
      budget_max: budget_max && budget_max > 0 ? budget_max : undefined,
      q: searchQ || undefined,
      limit: 200,
    }
  }, [usage, budgetMaxJt, searchQ])

  const productsQuery = useQuery({
    queryKey: ['public-products', query],
    queryFn: () => fetchPublicProducts(query),
  })

  const products = productsQuery.data ?? []
  const total = products.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIdx = total === 0 ? 0 : (safePage - 1) * pageSize
  const endIdx = Math.min(startIdx + pageSize, total)
  const pageItems = products.slice(startIdx, endIdx)

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function resetFilters() {
    setUsage('')
    setBudgetMaxJt('')
    setSearchInput('')
    setSearchQ('')
    setPage(1)
  }

  return (
    <div className="min-h-full bg-bg text-text">
      {/* ---------------- Header ---------------- */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#12151a] shadow-[0_2px_10px_rgba(18,21,26,0.35)]">
              <Icon name="sparkles" size={15} stroke={2} className="text-[#EEFF8C]" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#3AA39A] ring-2 ring-bg" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">SalesMind AI</p>
              <p className="text-[10.5px] font-medium text-faint">Asisten belanja laptop ASUS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="hidden sm:inline-flex"
              onClick={() => scrollTo('katalog')}
            >
              Lihat produk
            </Button>
            <Button type="button" onClick={() => scrollTo('chat-ai')}>
              Tanya AI
              <Icon name="arrowRight" size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ---------------- Hero (dark console panel) ---------------- */}
        <section className="relative overflow-hidden bg-[#12151a]">
          {/* circuit-trace texture */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="trace" width="64" height="64" patternUnits="userSpaceOnUse">
                <path
                  d="M0 32H20M20 32V12H44M44 12H64M20 32V52H64M32 0V20"
                  stroke="#EEFF8C"
                  strokeWidth="1"
                  fill="none"
                />
                <circle cx="20" cy="32" r="2" fill="#EEFF8C" />
                <circle cx="44" cy="12" r="2" fill="#EEFF8C" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#trace)" />
          </svg>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 55% at 12% 15%, rgba(58,163,154,0.28), transparent 60%), radial-gradient(ellipse 45% 45% at 92% 8%, rgba(238,255,140,0.16), transparent 55%)',
            }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EEFF8C]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  Ditenagai AI · Katalog resmi ASUS
                </span>
              </div>
              <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
                Pilih laptop yang pas,{' '}
                <span className="bg-gradient-to-r from-[#EEFF8C] to-[#3AA39A] bg-clip-text text-transparent">
                  dibantu AI
                </span>{' '}
                dari katalog resmi.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60">
                Ceritakan budget dan kebutuhanmu. AI merekomendasikan dari data produk —
                bukan mengarang spek.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="bg-[#EEFF8C] px-5 py-2.5 text-[#12151a] hover:bg-[#e4f579]"
                  onClick={() => scrollTo('chat-ai')}
                >
                  Tanya AI sekarang
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-white/15 bg-white/5 px-5 py-2.5 text-white hover:bg-white/10"
                  onClick={() => scrollTo('katalog')}
                >
                  Jelajahi katalog
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-6 text-white/40">
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <Icon name="box" size={13} />
                  <span>{total || '—'} produk live</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <Icon name="sparkles" size={13} />
                  <span>Balasan instan</span>
                </div>
              </div>
            </div>

            {/* console mockup */}
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-1.5 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-1.5 px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-2 text-[10.5px] font-mono tracking-wide text-white/30">
                  salesmind — asisten
                </span>
              </div>
              <div className="rounded-[14px] bg-[#0c0e12] p-4">
                <p className="mb-3 px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Contoh pertanyaan
                </p>
                <ul className="space-y-2">
                  {EXAMPLE_QUESTIONS.map((q, i) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => scrollTo('chat-ai')}
                        className="group flex w-full items-center gap-2.5 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:border-[#3AA39A]/40 hover:bg-white/[0.05]"
                      >
                        <span className="font-mono text-[10px] text-[#3AA39A]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 text-[13px] leading-snug text-white/75">{q}</span>
                        <Icon
                          name="arrowRight"
                          size={13}
                          className="text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-[#EEFF8C]"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-white/[0.06] px-3.5 py-2.5">
                  <span className="font-mono text-[13px] text-white/25">ketik pesanmu...</span>
                  <span className="ml-auto h-3.5 w-[2px] animate-pulse bg-[#EEFF8C]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Catalog ---------------- */}
        <section id="katalog" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                Katalog
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Semua laptop ASUS</h2>
              <p className="mt-1.5 text-sm text-muted">
                Cari produk, atur jumlah tampilan, lalu lanjut tanya AI bila butuh rekomendasi.
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-4 rounded-[18px] border border-border bg-card p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:p-5">
            <div className="relative">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama, brand, series, processor..."
                className="w-full rounded-[10px] border border-border bg-bg py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {USAGE_OPTIONS.map((opt) => {
                const active = usage === opt.value
                return (
                  <button
                    key={opt.value || 'all'}
                    type="button"
                    onClick={() => setUsage(opt.value)}
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      active
                        ? 'bg-text text-highlight shadow-sm'
                        : 'bg-bg text-muted hover:bg-brand-light/40 hover:text-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    placeholder="Budget maks"
                    value={budgetMaxJt}
                    onChange={(e) => setBudgetMaxJt(e.target.value)}
                    className="w-40 rounded-[10px] border border-border bg-bg py-2 pl-3 pr-9 text-sm font-mono outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-faint">
                    Jt
                  </span>
                </div>
                {(usage || budgetMaxJt || searchInput) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-[12.5px] font-semibold text-faint transition-colors hover:text-danger"
                  >
                    <Icon name="x" size={12} />
                    Reset filter
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-[12px] font-medium text-muted">
                Tampilkan
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-[8px] border border-border bg-bg px-2.5 py-1.5 text-sm font-semibold text-text outline-none focus:border-brand"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                entri
              </label>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-medium text-muted">
            <p>
              {total === 0
                ? 'Menampilkan 0 produk'
                : `Menampilkan ${startIdx + 1}–${endIdx} dari ${total} produk`}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-border bg-card text-muted transition-colors hover:bg-brand-light/40 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="chevLeft" size={14} />
                </button>
                <span className="px-2 font-mono text-text">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-border bg-card text-muted transition-colors hover:bg-brand-light/40 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="chevRight" size={14} />
                </button>
              </div>
            ) : null}
          </div>

          {productsQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: pageSize > 8 ? 8 : pageSize }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-[16px] border border-border bg-card"
                >
                  <div className="aspect-[4/3] bg-sidebar" />
                  <div className="space-y-2 p-3.5">
                    <div className="h-2.5 w-1/3 rounded bg-sidebar" />
                    <div className="h-3.5 w-4/5 rounded bg-sidebar" />
                    <div className="h-3.5 w-1/2 rounded bg-sidebar" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {productsQuery.isError ? (
            <p className="rounded-[12px] border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              Gagal memuat katalog. Pastikan API berjalan di :8000.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((product) => {
              const thumb = mediaUrl(product.thumbnail)
              const specs = [product.processor, product.ram, product.storage]
              if (product.gpu && product.gpu !== '-') specs.push(product.gpu)
              return (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-[16px] border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_12px_30px_-12px_rgba(18,21,26,0.18)]"
                >
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-sidebar">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Icon name="box" size={28} className="text-faint" />
                    )}
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-[#12151a]/90 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                      {product.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-faint">
                      {product.brand}
                    </p>
                    <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug">
                      {product.name}
                    </h3>
                    <p className="font-mono text-base font-bold tabular-nums text-brand">
                      {formatRp(product.price)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {specs.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-bg px-2 py-0.5 text-[10px] font-medium text-muted"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-auto w-full text-xs"
                      onClick={() => scrollTo('chat-ai')}
                    >
                      Tanya AI tentang ini
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>

          {!productsQuery.isLoading && total === 0 ? (
            <div className="mt-6 rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-bg">
                <Icon name="search" size={18} className="text-faint" />
              </div>
              <p className="text-sm font-medium text-muted">
                Tidak ada produk untuk pencarian/filter ini.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="secondary" onClick={resetFilters}>
                  Reset filter
                </Button>
                <Button type="button" onClick={() => scrollTo('chat-ai')}>
                  Tanya AI saja
                </Button>
              </div>
            </div>
          ) : null}

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <span className="font-mono text-xs text-muted">
                {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          ) : null}
        </section>

        {/* ---------------- Chat ---------------- */}
        <section id="chat-ai" className="scroll-mt-6 border-t border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                Tanya AI
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Chat tanpa login
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Rekomendasi ditarik langsung dari katalog database — bukan jawaban generik.
              </p>

              <ol className="mt-8 space-y-5">
                {HOW_IT_WORKS.map((step) => (
                  <li key={step.n} className="flex gap-3.5">
                    <span className="mt-0.5 font-mono text-[11px] font-bold text-brand/60">
                      {step.n}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{step.title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* device-frame around the chat widget */}
            <div className="rounded-[20px] bg-[#12151a] p-2 shadow-xl">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="ml-auto flex items-center gap-1.5 text-[10.5px] font-medium text-white/40">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3AA39A]" />
                  AI Online
                </span>
              </div>
              <div className="overflow-hidden rounded-[14px] bg-bg">
                <PublicChatWidget />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-7 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-medium">SalesMind AI — prototype storefront</p>
          <Link
            to="/login"
            className="font-semibold text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Masuk Sales Console
          </Link>
        </div>
      </footer>
    </div>
  )
}