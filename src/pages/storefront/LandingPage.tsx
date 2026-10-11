import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PublicChatWidget, type ChatDraft } from '@/components/chat/PublicChatWidget'
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown'
import { Icon } from '@/components/ui/Icon'
import { formatRp } from '@/lib/format'
import type { PublicChatMessage } from '@/services/publicChatService'
import { fetchPublicProducts, fetchPublicStore } from '@/services/publicProductService'
import type { PublicProduct } from '@/types/public'
import {
  Drawer,
  LIME,
  Photo,
  STAGE,
  WaGlyph,
  gpuBadge,
  isRtx,
  orderText,
  screenInches,
  useCases,
  waLink,
} from '@/pages/storefront/storefrontShared'

const USAGE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'programming', label: 'Ngoding' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'editing', label: 'Editing' },
  { value: 'office', label: 'Kantor' },
  { value: 'mahasiswa', label: 'Kuliah' },
]

const BUDGET_PRESETS = [10, 15, 20, 30]
const COMPARE_MAX = 3
const INITIAL_ROWS = 12
const ROW_GRID =
  'lg:grid-cols-[24px_132px_minmax(0,1.5fr)_minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1.25fr)_minmax(0,1.1fr)_108px]'

/** Kelas perkiraan 1 sampai 5 dari nama chip. Bukan benchmark. */
function cpuTier(cpu: string) {
  const c = cpu.toLowerCase()
  if (/n100/.test(c)) return 1
  if (/n305|ryzen 3|\bi3\b/.test(c)) return 1.5
  if (/i9|ultra 9|ryzen ai 9|ryzen 9/.test(c)) return /hx|ultra 9/.test(c) ? 5 : 4.5
  if (/i7-\d+hx/.test(c)) return 4.5
  if (/ryzen 7|i7-\d+h\b|ultra 7/.test(c)) return 4
  if (/i7/.test(c)) return 3.5
  if (/i5-\d+h\b/.test(c)) return 3
  if (/ryzen 5|i5/.test(c)) return 2.5
  return 2
}

function gpuTier(gpu: string) {
  const g = gpu.toLowerCase()
  if (/4080/.test(g)) return 5
  if (/4070/.test(g)) return 4
  if (/4060/.test(g)) return 3.5
  if (/4050/.test(g)) return 3
  if (/arc/.test(g)) return 2
  if (/iris|radeon/.test(g)) return 1.5
  return 1
}

function ramGb(ram: string) {
  const m = ram.match(/(\d+)\s*GB/i)
  return m ? Number(m[1]) : null
}

function TierBar({ value, label, tone = 'ink' }: { value: number; label: string; tone?: 'ink' | 'lime' }) {
  const filled = Math.round(value * 2)
  return (
    <span className="inline-flex items-center gap-2" title={`${label}: kelas ${value} dari 5, perkiraan dari nama chip`}>
      <span aria-hidden className="flex gap-[2px]">
        {Array.from({ length: filled }, (_, i) => (
          <span key={i} className={`h-2.5 w-[5px] ${tone === 'lime' ? 'bg-[#D6E56A]' : 'bg-[#121410]'}`} />
        ))}
      </span>
      <span aria-hidden className={`font-mono text-[10.5px] ${tone === 'lime' ? 'text-white/55' : 'text-muted'}`}>
        {String(value).replace('.', ',')}/5
      </span>
      <span className="sr-only">
        {label} kelas {value} dari 5
      </span>
    </span>
  )
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[#121410]/45 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <section
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[16px] bg-white transition-[transform,visibility] duration-300 ease-out ${
          open ? 'visible translate-y-0' : 'invisible translate-y-full'
        }`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 bg-[#121410]/15" />
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-2">
          <div className="min-w-0">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-muted hover:bg-[#121410]/5 hover:text-text"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto border-t border-[#121410]/[0.07]">{children}</div>
      </section>
    </div>
  )
}

const SORT_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Urutan katalog' },
  { value: 'asc', label: 'Harga terendah' },
  { value: 'desc', label: 'Harga tertinggi' },
  { value: 'cpu', label: 'Kelas CPU tertinggi' },
  { value: 'gpu', label: 'Kelas GPU tertinggi' },
]

type Query = { budgetMax: number | null; usage: string | null }

function parseQuery(text: string): Query {
  const t = text.toLowerCase().replace(/,/g, '.')
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|sampai|s\/d|hingga)\s*(\d+(?:\.\d+)?)\s*(?:juta|jt)/)
  const single = t.match(/(?:di ?bawah|maks(?:imal)?|budget|bujet|kurang dari)\s*(?:rp\s*)?(\d+(?:\.\d+)?)\s*(?:juta|jt)/)
  const budgetMax = range ? Number(range[2]) : single ? Number(single[1]) : null
  let usage: string | null = null
  if (/gaming|game/.test(t)) usage = 'gaming'
  else if (/edit|desain|render|video/.test(t)) usage = 'editing'
  else if (/ngoding|coding|program|developer|docker/.test(t)) usage = 'programming'
  else if (/kantor|office|admin/.test(t)) usage = 'office'
  else if (/kuliah|mahasiswa|sekolah|pelajar/.test(t)) usage = 'study'
  return { budgetMax, usage }
}

function reasonsFor(product: PublicProduct, q: Query) {
  const out: { text: string; ok: boolean }[] = []
  if (q.budgetMax) {
    const ok = product.price <= q.budgetMax * 1_000_000
    out.push({ text: ok ? `masuk budget ${q.budgetMax} jt` : `di atas budget ${q.budgetMax} jt`, ok })
  }
  const ram = ramGb(product.ram)
  const badge = gpuBadge(product)
  if (q.usage === 'gaming') {
    out.push(isRtx(product) ? { text: `GPU ${badge}`, ok: true } : { text: 'tanpa GPU NVIDIA', ok: false })
  }
  if (q.usage === 'editing') {
    if (isRtx(product)) out.push({ text: `GPU ${badge}`, ok: true })
    if (ram) out.push({ text: `RAM ${ram}GB`, ok: ram >= 16 })
  }
  if (q.usage === 'programming' && ram) out.push({ text: `RAM ${ram}GB`, ok: ram >= 16 })
  if ((q.usage === 'office' || q.usage === 'study') && screenInches(product.name)) {
    out.push({ text: `layar ${screenInches(product.name)}`, ok: true })
  }
  return out
}

const PRODUCT_ID_RE = /\(ID:\s*(\d+)\)/gi

function picksFromReply(text: string, products: PublicProduct[]) {
  const ids = [...text.matchAll(PRODUCT_ID_RE)].map((m) => Number(m[1]))
  let found = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as PublicProduct[]
  if (!found.length) found = products.filter((p) => text.includes(p.name))
  return [...new Map(found.map((p) => [p.id, p])).values()].slice(0, 6)
}

const SPEC_LINE_RE =
  /^\s*([*\-•]|\d+\.)\s+\**\s*(harga|processor|prosesor|cpu|ram|memori|storage|penyimpanan|ssd|gpu|vga|kartu grafis|layar|cocok untuk|kategori|series)\s*\**\s*:/i

/** Spek per produk sudah tampil di lembar hasil, jadi chat cukup menyebut nama dan alasannya. */
function condenseReply(text: string) {
  if (!/\(ID:\s*\d+\)/i.test(text)) return text
  const kept = text
    .split('\n')
    .filter((line) => !SPEC_LINE_RE.test(line))
    .join('\n')
    .replace(/\s*\(ID:\s*\d+\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return `${kept}\n\nSpek dan harga lengkap ada di lembar hasil.`
}

function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{children}</span>
}

function Marker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`px-1 ${className}`} style={{ background: LIME, color: STAGE }}>
      {children}
    </span>
  )
}

export function LandingPage() {
  const [usage, setUsage] = useState('')
  const [budgetMaxJt, setBudgetMaxJt] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [series, setSeries] = useState('')
  const [rtxOnly, setRtxOnly] = useState(false)
  const [sort, setSort] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [draft, setDraft] = useState<ChatDraft | null>(null)
  const [chatMessages, setChatMessages] = useState<PublicChatMessage[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detail, setDetail] = useState<PublicProduct | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [compareIds, setCompareIds] = useState<number[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQ(searchInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setShowAll(false)
  }, [usage, budgetMaxJt, searchQ, series, rtxOnly, sort])

  const query = useMemo(() => {
    const budget_max = budgetMaxJt ? Number(budgetMaxJt) * 1_000_000 : undefined
    return {
      usage: usage || undefined,
      budget_max: budget_max && budget_max > 0 ? budget_max : undefined,
      q: searchQ || undefined,
      limit: 200,
    }
  }, [usage, budgetMaxJt, searchQ])

  const allQuery = useQuery({
    queryKey: ['public-products', 'all'],
    queryFn: () => fetchPublicProducts({ limit: 200 }),
  })
  const productsQuery = useQuery({
    queryKey: ['public-products', query],
    queryFn: () => fetchPublicProducts(query),
  })
  const storeQuery = useQuery({ queryKey: ['public-store'], queryFn: fetchPublicStore, staleTime: 5 * 60_000 })

  const all = useMemo(() => allQuery.data ?? [], [allQuery.data])
  const storeWa = storeQuery.data?.whatsapp ?? null
  const generalWa = waLink(storeWa, 'Halo, saya mau tanya soal laptop ASUS di katalog SalesMind.')

  const stats = useMemo(() => {
    if (!all.length) return null
    const byPrice = [...all].sort((a, b) => a.price - b.price)
    const rtx = byPrice.filter(isRtx)
    const under10 = byPrice.filter((p) => p.price < 10_000_000)
    return {
      count: all.length,
      min: byPrice[0].price,
      max: byPrice[byPrice.length - 1].price,
      rtx: rtx.length,
      rtxFrom: rtx[0]?.price ?? null,
      under10: under10.length,
    }
  }, [all])

  const seriesList = useMemo(() => [...new Set(all.map((p) => p.category))].sort(), [all])

  const products = useMemo(() => {
    let list = productsQuery.data ?? []
    if (series) list = list.filter((p) => p.category === series)
    if (rtxOnly) list = list.filter(isRtx)
    if (sort === 'asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'cpu') list = [...list].sort((a, b) => cpuTier(b.processor) - cpuTier(a.processor) || a.price - b.price)
    if (sort === 'gpu') list = [...list].sort((a, b) => gpuTier(b.gpu) - gpuTier(a.gpu) || a.price - b.price)
    return list
  }, [productsQuery.data, series, rtxOnly, sort])

  const visible = showAll ? products : products.slice(0, INITIAL_ROWS)

  const aiSheet = useMemo(() => {
    let reply = ''
    let asked = ''
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const m = chatMessages[i]
      if (!reply && m.role === 'assistant') reply = m.content
      else if (reply && m.role === 'user') {
        asked = m.content
        break
      }
    }
    const picks = reply && all.length ? picksFromReply(reply, all) : []
    return { picks, asked, q: parseQuery(asked) }
  }, [chatMessages, all])

  const compareItems = useMemo(
    () => compareIds.map((id) => all.find((p) => p.id === id)).filter(Boolean) as PublicProduct[],
    [compareIds, all],
  )
  const cheapestCompareId = compareItems.length ? [...compareItems].sort((a, b) => a.price - b.price)[0].id : null
  const hasFilter = Boolean(usage || budgetMaxJt || searchInput || series || rtxOnly)

  type Shortcut = {
    key: string
    label: string
    note: string
    apply: { usage?: string; budget?: string; rtx?: boolean; sort?: string }
  }
  const shortcuts: Shortcut[] = [
    { key: 'gaming', label: 'Gaming', note: 'urut dari GPU terkuat', apply: { usage: 'gaming', sort: 'gpu' } },
    { key: 'ngoding', label: 'Ngoding', note: 'urut dari CPU terkuat', apply: { usage: 'programming', sort: 'cpu' } },
    { key: 'editing', label: 'Editing video', note: 'urut dari GPU terkuat', apply: { usage: 'editing', sort: 'gpu' } },
    {
      key: 'murah',
      label: 'Di bawah 10 juta',
      note: stats ? `${stats.under10} model, termurah ${formatRp(stats.min)}` : 'memuat',
      apply: { budget: '10', sort: 'asc' },
    },
    {
      key: 'rtx',
      label: 'GPU NVIDIA RTX',
      note: stats?.rtxFrom ? `${stats.rtx} model, mulai ${formatRp(stats.rtxFrom)}` : 'memuat',
      apply: { rtx: true, sort: 'asc' },
    },
  ]
  const activeShortcut = shortcuts.find(
    ({ apply }) =>
      (apply.usage ?? '') === usage &&
      (apply.budget ?? '') === budgetMaxJt &&
      Boolean(apply.rtx) === rtxOnly &&
      (apply.sort ?? '') === sort &&
      !series &&
      !searchInput,
  )?.key

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function focusChat() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('#chat-ai input[aria-label="Tulis pesan"]')?.focus({ preventScroll: true })
    }, 350)
  }

  function prefill(text: string) {
    setDetailOpen(false)
    setCompareOpen(false)
    setSheetOpen(false)
    setDraft({ text, nonce: Date.now() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function askAbout(p: PublicProduct) {
    prefill(`Saya tertarik ${p.name} (${formatRp(p.price)}). Cocok untuk kebutuhan apa, dan apa kekurangannya?`)
  }

  function openDetail(p: PublicProduct) {
    setDetail(p)
    setDetailOpen(true)
  }

  function toggleCompare(p: PublicProduct) {
    setCompareIds((ids) =>
      ids.includes(p.id) ? ids.filter((id) => id !== p.id) : ids.length >= COMPARE_MAX ? ids : [...ids, p.id],
    )
  }

  function resetFilters() {
    setUsage('')
    setBudgetMaxJt('')
    setSearchInput('')
    setSearchQ('')
    setSeries('')
    setRtxOnly(false)
    setSort('')
  }

  function applyShortcut(s: Shortcut) {
    resetFilters()
    setUsage(s.apply.usage ?? '')
    setBudgetMaxJt(s.apply.budget ?? '')
    setRtxOnly(Boolean(s.apply.rtx))
    setSort(s.apply.sort ?? '')
    window.setTimeout(() => scrollTo('katalog'), 50)
  }

  function onReply(messages: PublicChatMessage[]) {
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!last || !window.matchMedia('(max-width: 1023px)').matches) return
    if (picksFromReply(last.content, all).length) setSheetOpen(true)
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setSearchQ(searchInput.trim())
    scrollTo('katalog')
  }

  const pill = (active: boolean) =>
    `rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold transition-colors duration-200 ${
      active ? 'bg-[#121410] text-[#D6E56A]' : 'text-muted hover:bg-[#D6E56A]/35 hover:text-text'
    }`

  const sheetCaption = aiSheet.picks.length
    ? `${aiSheet.picks.length} laptop dari balasan AI terakhir`
    : 'menunggu pertanyaan'

  const pickList = (
    <>
      {aiSheet.asked ? (
        <p className="border-b border-[#121410]/[0.07] px-5 py-2.5 text-[13px] text-muted">
          Untuk: <span className="font-semibold text-text">“{aiSheet.asked}”</span>
        </p>
      ) : null}
      <ul className="divide-y divide-[#121410]/[0.07]">
        {aiSheet.picks.map((p) => {
          const reasons = reasonsFor(p, aiSheet.q)
          const orderUrl = waLink(storeWa, orderText(p))
          return (
            <li key={p.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 px-5 py-4 sm:grid-cols-[80px_minmax(0,1fr)_auto]">
              <button
                type="button"
                onClick={() => openDetail(p)}
                className="flex h-16 items-center justify-center rounded-[8px] bg-[radial-gradient(ellipse_at_50%_30%,#FBFAF7,#E6E2DA)]"
                aria-label={`Detail ${p.name}`}
              >
                <Photo product={p} className="h-14 w-full" />
              </button>
              <div className="min-w-0">
                <button type="button" onClick={() => openDetail(p)} className="text-left text-[15px] font-semibold leading-snug hover:underline">
                  {p.name}
                </button>
                <div className="mt-1.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-muted">
                  <span>cpu</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                    <TierBar value={cpuTier(p.processor)} label="CPU" />
                    <span className="text-text">{p.processor}</span>
                  </span>
                  <span>gpu</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                    <TierBar value={gpuTier(p.gpu)} label="GPU" />
                    <span className="text-text">{p.gpu}</span>
                  </span>
                  <span>mem</span>
                  <span className="text-text">
                    {p.ram}, {p.storage}
                  </span>
                </div>
                {reasons.length ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {reasons.map((r) => (
                      <li
                        key={r.text}
                        className={`px-1.5 py-0.5 font-mono text-[11px] ${
                          r.ok ? 'bg-[#121410] text-[#F4F3F1]' : 'text-danger shadow-[inset_0_0_0_1px_currentColor]'
                        }`}
                      >
                        {r.ok ? '✓' : '!'} {r.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
                <Mono className="text-[15px] font-semibold">
                  <Marker className="py-0.5">{formatRp(p.price)}</Marker>
                </Mono>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => toggleCompare(p)}
                    className="rounded-[8px] px-2 py-1 text-[12px] font-semibold text-muted transition-colors duration-200 hover:bg-[#121410]/5 hover:text-text"
                  >
                    {compareIds.includes(p.id) ? '− banding' : '+ banding'}
                  </button>
                  {orderUrl ? (
                    <a
                      href={orderUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Pesan ${p.name} via WhatsApp`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-text transition-colors duration-200 hover:bg-[#121410]/5"
                    >
                      <WaGlyph size={15} />
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )

  return (
    <div className="ds-page min-h-full bg-[#F4F3F1] text-text">
      <a
        href="#katalog"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Lewati ke katalog
      </a>

      <header className="sticky top-0 z-30 border-b border-[#121410]/10 bg-[#F4F3F1]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex shrink-0 items-baseline gap-2"
          >
            <span className="text-[19px] font-bold tracking-[-0.04em]">SalesMind</span>
            <Mono className="hidden text-[11px] text-muted sm:inline">laptop ASUS</Mono>
          </button>
          <form
            onSubmit={onSearch}
            className="flex min-w-0 flex-1 items-center gap-2 border-b border-[#121410]/20 py-1 transition-colors duration-200 focus-within:border-[#121410]"
          >
            <Icon name="search" size={16} className="shrink-0 text-faint" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama, CPU, GPU…"
              aria-label="Cari produk"
              className="min-w-0 flex-1 bg-transparent py-1 text-[14.5px] outline-none placeholder:text-faint"
            />
          </form>
          {generalWa ? (
            <a
              href={generalWa}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 text-[13.5px] font-semibold text-text transition-opacity duration-200 hover:opacity-70 md:inline-flex"
            >
              <WaGlyph size={15} />
              WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={focusChat}
            className="shrink-0 rounded-[8px] bg-[#D6E56A] px-3.5 py-2 text-[13.5px] font-bold text-[#121410] shadow-[inset_0_0_0_1px_rgba(18,20,16,0.12)] transition-[filter,transform] duration-200 hover:brightness-95 active:translate-y-px"
          >
            Tanya AI
          </button>
        </div>
      </header>

      <main>
        <section id="chat-ai" className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 88% 8%, rgba(214,229,106,0.45), transparent 70%), radial-gradient(ellipse 40% 35% at 0% 100%, rgba(214,229,106,0.18), transparent 70%)',
            }}
          />
          <div className="relative mx-auto max-w-[1320px] px-4 pb-10 pt-7 sm:px-6 lg:pb-12 lg:pt-10">
            <p className="truncate font-mono text-[11.5px] text-muted">
              {stats ? (
                <>
                  {stats.count} laptop ASUS
                  <span className="hidden sm:inline">
                    , {formatRp(stats.min)} sampai {formatRp(stats.max)}
                  </span>
                  , data dari database toko
                </>
              ) : (
                'memuat katalog'
              )}
            </p>
            <h1 className="mt-4 max-w-[19ch] text-[clamp(2.1rem,5vw,4.25rem)] font-bold leading-[0.98]">
              Tulis kebutuhanmu, dapat{' '}
              <span className="box-decoration-clone bg-[linear-gradient(transparent_55%,#D6E56A_55%,#D6E56A_90%,transparent_90%)] px-1">
                lembar spek.
              </span>
            </h1>

            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="self-start rounded-[16px] shadow-[0_0_0_1px_rgba(18,20,16,0.1),0_24px_48px_-32px_rgba(18,20,16,0.45)] lg:sticky lg:top-20">
                <PublicChatWidget
                  draft={draft}
                  onMessages={setChatMessages}
                  onReply={onReply}
                  formatReply={condenseReply}
                  tight
                  className="h-[480px] sm:h-[540px]"
                />
              </div>

              <div className="hidden min-h-[320px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_0_0_1px_rgba(18,20,16,0.1),0_24px_48px_-32px_rgba(18,20,16,0.45)] lg:flex">
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 text-[#F4F3F1]" style={{ background: STAGE }}>
                  <p className="flex items-center gap-2 text-[15px] font-bold">
                    <span className="h-2 w-2" style={{ background: LIME }} />
                    Lembar hasil
                  </p>
                  <Mono className="truncate text-[11.5px] text-[#D6E56A]">{sheetCaption}</Mono>
                </div>
                {aiSheet.picks.length ? (
                  <div className="flex-1 overflow-y-auto">{pickList}</div>
                ) : (
                  <div className="flex flex-1 flex-col justify-center px-8 py-10">
                    <p className="max-w-[40ch] text-[17px] font-semibold leading-snug [text-wrap:balance]">
                      Laptop yang disebut AI muncul di sini sebagai baris spek.
                    </p>
                    <p className="mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-muted">
                      Kelas CPU dan GPU, memori, harga, dan tanda apakah masuk budget dan kebutuhanmu. Tidak tercatat,
                      berarti AI bilang tidak tahu.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="jalan-pintas">
          <div className="mx-auto max-w-[1320px] px-4 pb-2 sm:px-6">
            <h2 id="jalan-pintas" className="font-mono text-[11.5px] font-normal tracking-normal text-muted">
              jalan pintas ke katalog
            </h2>
            <div className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
              {shortcuts.map((s) => {
                const active = activeShortcut === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => (active ? resetFilters() : applyShortcut(s))}
                    className={`group flex min-w-[200px] snap-start flex-col rounded-[16px] p-4 text-left transition-[background-color,box-shadow,transform] duration-200 active:translate-y-px sm:min-w-0 ${
                      active
                        ? 'bg-[#121410] text-[#F4F3F1]'
                        : 'bg-white shadow-[0_0_0_1px_rgba(18,20,16,0.06),0_14px_30px_-26px_rgba(36,32,24,0.6)] hover:bg-[#D6E56A]/40'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-[15.5px] font-semibold">
                      {s.label}
                      <Icon
                        name={active ? 'x' : 'arrowRight'}
                        size={15}
                        stroke={2}
                        className={`shrink-0 transition-transform duration-200 ${active ? 'text-[#D6E56A]' : 'text-muted group-hover:translate-x-0.5 group-hover:text-text'}`}
                      />
                    </span>
                    <Mono className={`mt-1.5 text-[11.5px] ${active ? 'text-[#D6E56A]' : 'text-muted'}`}>{s.note}</Mono>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section id="katalog" className="scroll-mt-20">
          <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-12 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-none">
                Katalog{' '}
                <Mono className="align-middle text-[14px] font-medium tracking-normal text-muted">
                  {productsQuery.isLoading ? '…' : `${products.length} baris`}
                </Mono>
              </h2>
              <Dropdown label="Urutkan" value={sort} options={SORT_OPTIONS} onChange={setSort} align="right" />
            </div>

            <div className="mt-5 rounded-[16px] bg-white shadow-[0_0_0_1px_rgba(18,20,16,0.06),0_40px_80px_-48px_rgba(38,42,33,0.45)]">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-t-[16px] border-b border-[#121410]/[0.07] bg-[#FAF9F5] px-4 py-3.5 sm:px-6">
                <div className="flex flex-wrap gap-1" role="group" aria-label="Kebutuhan">
                  {USAGE_OPTIONS.map((o) => (
                    <button key={o.value || 'all'} type="button" aria-pressed={usage === o.value} onClick={() => setUsage(o.value)} className={pill(usage === o.value)}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Budget maksimal">
                  <span className="mr-1 font-mono text-[11.5px] text-muted">maks</span>
                  {BUDGET_PRESETS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={budgetMaxJt === String(b)}
                      onClick={() => setBudgetMaxJt(budgetMaxJt === String(b) ? '' : String(b))}
                      className={`${pill(budgetMaxJt === String(b))} font-mono`}
                    >
                      {b}jt
                    </button>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                  <input type="checkbox" checked={rtxOnly} onChange={(e) => setRtxOnly(e.target.checked)} className="h-4 w-4 accent-[#121410]" />
                  Hanya NVIDIA RTX
                </label>
                <Dropdown
                  label="Series"
                  value={series}
                  options={[{ value: '', label: 'Semua' }, ...seriesList.map((s) => ({ value: s, label: s }))]}
                  onChange={setSeries}
                />
                {hasFilter || sort ? (
                  <button type="button" onClick={resetFilters} className="ml-auto text-[13px] font-semibold text-muted underline underline-offset-4 hover:text-text">
                    Hapus filter
                  </button>
                ) : null}
              </div>

              <div aria-hidden className={`hidden gap-4 px-4 pb-1 pt-4 font-mono text-[11px] text-muted sm:px-6 lg:grid ${ROW_GRID}`}>
                <span />
                <span />
                <span>produk</span>
                <span>cpu, kelas perkiraan</span>
                <span>gpu, kelas perkiraan</span>
                <span>memori, layar</span>
                <span className="text-right">harga</span>
                <span />
              </div>

              {productsQuery.isError ? (
                <p className="mx-4 mt-4 rounded-[8px] bg-danger/10 px-4 py-3 text-sm text-danger sm:mx-6">
                  Katalog gagal dimuat. Pastikan API berjalan di port 8000, lalu muat ulang halaman.
                </p>
              ) : null}

              <ul className="space-y-1 px-2 pb-2 pt-1 sm:px-3 sm:pb-3">
                {productsQuery.isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <li key={i} className={`grid animate-pulse grid-cols-[104px_1fr] gap-4 px-2 py-4 sm:px-3 ${ROW_GRID}`}>
                        <span className="hidden lg:block" />
                        <span className="h-20 rounded-[8px] bg-[#EDEAE4]" />
                        <span className="space-y-2 self-center">
                          <span className="block h-4 w-2/3 bg-[#EDEAE4]" />
                          <span className="block h-3 w-1/3 bg-[#EDEAE4]" />
                        </span>
                        <span className="hidden h-3 self-center bg-[#EDEAE4] lg:block" />
                        <span className="hidden h-3 self-center bg-[#EDEAE4] lg:block" />
                        <span className="hidden h-3 self-center bg-[#EDEAE4] lg:block" />
                        <span className="hidden h-4 self-center bg-[#EDEAE4] lg:block" />
                      </li>
                    ))
                  : visible.map((p) => {
                      const picked = compareIds.includes(p.id)
                      const full = !picked && compareIds.length >= COMPARE_MAX
                      const orderUrl = waLink(storeWa, orderText(p))
                      const screen = screenInches(p.name)
                      const uses = useCases(p, 3)
                      return (
                        <li
                          key={p.id}
                          className={`group grid grid-cols-[104px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[8px] px-2 py-3 transition-colors duration-200 sm:px-3 lg:gap-4 ${ROW_GRID} ${
                            picked ? 'bg-[#D6E56A]/30' : 'hover:bg-[#D6E56A]/15'
                          }`}
                        >
                          <label className="hidden cursor-pointer justify-center lg:flex" title={full ? 'Maksimal 3 laptop' : 'Bandingkan'}>
                            <input
                              type="checkbox"
                              checked={picked}
                              disabled={full}
                              onChange={() => toggleCompare(p)}
                              aria-label={`Bandingkan ${p.name}`}
                              className="h-4 w-4 accent-[#121410]"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => openDetail(p)}
                            aria-label={`Detail ${p.name}`}
                            className="relative flex h-20 items-center justify-center overflow-hidden rounded-[8px] bg-[radial-gradient(ellipse_at_50%_30%,#FBFAF7,#E6E2DA)] lg:h-[92px]"
                          >
                            <span className="absolute bottom-2.5 left-1/2 h-2.5 w-[60%] -translate-x-1/2 rounded-[50%] bg-[#121410]/25 blur-[6px]" />
                            <Photo product={p} className="relative h-[70px] w-full transition-transform duration-300 group-hover:scale-[1.06] lg:h-[82px]" />
                          </button>
                          <div className="min-w-0">
                            <button type="button" onClick={() => openDetail(p)} className="text-left text-[15.5px] font-semibold leading-snug hover:underline">
                              {p.name}
                            </button>
                            {uses ? <p className="mt-1 text-[12.5px] leading-snug text-muted [text-wrap:pretty]">{uses}</p> : null}
                          </div>

                          <div className="col-span-2 grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 font-mono text-[12px] lg:col-span-1 lg:block">
                            <span className="text-muted lg:hidden">cpu</span>
                            <span className="flex min-w-0 flex-col gap-1">
                              <TierBar value={cpuTier(p.processor)} label="CPU" />
                              <span className="break-words">{p.processor}</span>
                            </span>
                          </div>
                          <div className="col-span-2 grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 font-mono text-[12px] lg:col-span-1 lg:block">
                            <span className="text-muted lg:hidden">gpu</span>
                            <span className="flex min-w-0 flex-col items-start gap-1">
                              <TierBar value={gpuTier(p.gpu)} label="GPU" />
                              {isRtx(p) ? <Marker className="font-semibold">{p.gpu}</Marker> : <span className="break-words">{p.gpu}</span>}
                            </span>
                          </div>
                          <div className="col-span-2 grid grid-cols-[3rem_minmax(0,1fr)] font-mono text-[12px] lg:col-span-1 lg:block">
                            <span className="text-muted lg:hidden">mem</span>
                            <span className="min-w-0">
                              <span className="block">{p.ram}</span>
                              <span className="block text-muted">{p.storage}</span>
                              {screen ? <span className="block text-muted">layar {screen}</span> : null}
                            </span>
                          </div>

                          <Mono className="col-span-2 text-[17px] font-semibold lg:col-span-1 lg:text-right lg:text-[15px]">{formatRp(p.price)}</Mono>

                          <div className="col-span-2 flex items-center gap-1.5 lg:col-span-1 lg:justify-end">
                            <label className="mr-auto inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-muted lg:hidden">
                              <input type="checkbox" checked={picked} disabled={full} onChange={() => toggleCompare(p)} className="h-4 w-4 accent-[#121410]" />
                              Bandingkan
                            </label>
                            <button
                              type="button"
                              onClick={() => askAbout(p)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#121410] px-3 text-[13px] font-semibold text-[#F4F3F1] transition-colors duration-200 hover:bg-[#262a21] active:translate-y-px"
                            >
                              <Icon name="chat" size={14} stroke={2} />
                              Tanya
                            </button>
                            {orderUrl ? (
                              <a
                                href={orderUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Pesan ${p.name} via WhatsApp`}
                                title="Pesan via WhatsApp"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-white shadow-[inset_0_0_0_1px_rgba(18,20,16,0.18)] transition-colors duration-200 hover:bg-[#D6E56A]"
                              >
                                <WaGlyph size={16} />
                              </a>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
              </ul>

              {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 ? (
                <div className="px-4 pb-12 pt-8 sm:px-6">
                  <p className="text-lg font-bold">Tidak ada baris yang cocok.</p>
                  <p className="mt-1 text-sm text-muted">Longgarkan filter, atau tanya AI dengan kalimatmu sendiri.</p>
                  <div className="mt-4 flex gap-4 text-sm font-semibold">
                    <button type="button" onClick={resetFilters} className="underline underline-offset-4">
                      Hapus filter
                    </button>
                    <button type="button" onClick={focusChat} className="underline underline-offset-4">
                      Tanya AI
                    </button>
                  </div>
                </div>
              ) : null}

              {products.length > INITIAL_ROWS ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="group flex w-full items-center justify-center gap-2 rounded-b-[16px] border-t border-[#121410]/[0.07] bg-[#FAF9F5] px-4 py-4 text-[14px] font-semibold transition-colors duration-200 hover:bg-[#D6E56A]/25"
                >
                  {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua ${products.length} baris`}
                  <Icon
                    name="chevDown"
                    size={16}
                    stroke={2}
                    className={`transition-transform duration-200 ${showAll ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}
                  />
                </button>
              ) : null}
            </div>

            <p className="mt-6 max-w-[70ch] font-mono text-[11.5px] leading-relaxed text-muted">
              Bar kelas CPU dan GPU adalah perkiraan dari nama chip (skala 1 sampai 5), bukan hasil benchmark. Harga dan
              spek mengikuti database katalog.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden text-[#F4F3F1]" style={{ background: STAGE }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 50% 90% at 100% 0%, rgba(214,229,106,0.16), transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 py-10">
            <p className="max-w-[72ch] text-[15px] leading-relaxed text-white/75">
              <span className="font-bold text-[#D6E56A]">Cara belanja:</span> pilih atau tanya AI, kirim nama dan
              WhatsApp, lalu sales mengonfirmasi stok, harga akhir, garansi, pembayaran, dan pengiriman sebelum kamu bayar.
            </p>
            {generalWa ? (
              <a
                href={generalWa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-bold transition-[filter,transform] duration-200 hover:brightness-95 active:translate-y-px"
                style={{ background: LIME, color: STAGE }}
              >
                <WaGlyph size={16} />
                Chat sales di WhatsApp
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 font-mono text-[11.5px] text-white/45">
            <p>SalesMind bukan toko resmi ASUS. Harga bisa berubah, konfirmasi akhir oleh sales.</p>
            <div className="flex gap-4">
              <Link to="/login" className="transition-colors hover:text-white">
                login staf
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* mobile: pintu ke lembar hasil */}
      <div
        className={`fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-[opacity,transform] duration-300 lg:hidden ${
          aiSheet.picks.length && !sheetOpen && !compareItems.length ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
        inert={!aiSheet.picks.length || sheetOpen || Boolean(compareItems.length)}
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full max-w-[420px] items-center justify-between gap-3 rounded-[16px] bg-[#121410] px-4 py-3 text-left text-[#F4F3F1] shadow-[0_24px_48px_-18px_rgba(18,20,16,0.7)] active:translate-y-px"
        >
          <span className="flex items-center gap-2 text-[14px] font-bold">
            <span className="h-2 w-2" style={{ background: LIME }} />
            Lembar hasil
          </span>
          <Mono className="text-[12px] text-[#D6E56A]">{aiSheet.picks.length} laptop, buka</Mono>
        </button>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={
          <>
            <p className="flex items-center gap-2 text-[16px] font-bold">
              <span className="h-2 w-2" style={{ background: LIME }} />
              Lembar hasil
            </p>
            <Mono className="text-[11.5px] text-muted">{sheetCaption}</Mono>
          </>
        }
      >
        {pickList}
      </BottomSheet>

      <div
        className={`fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-[opacity,transform] duration-300 ${
          compareItems.length ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
        inert={!compareItems.length}
      >
        <div className="flex w-full max-w-[560px] items-center gap-3 rounded-[16px] bg-[#121410] p-2 pl-4 text-[#F4F3F1] shadow-[0_24px_48px_-18px_rgba(18,20,16,0.7)]">
          <Mono className="flex-1 truncate text-[12.5px] text-white/70">
            <span className="text-white">{compareItems.length}</span>/{COMPARE_MAX} dipilih
            {compareItems.length < 2 ? ', pilih satu lagi' : ''}
          </Mono>
          <button type="button" onClick={() => setCompareIds([])} className="px-2 py-2 text-[13px] font-semibold text-white/60 hover:text-white">
            Hapus
          </button>
          <button
            type="button"
            disabled={compareItems.length < 2}
            onClick={() => setCompareOpen(true)}
            className="rounded-[8px] bg-[#D6E56A] px-4 py-2.5 text-[13.5px] font-bold text-[#121410] transition-opacity duration-200 disabled:opacity-40"
          >
            Bandingkan
          </button>
        </div>
      </div>

      <Drawer open={detailOpen} onClose={() => setDetailOpen(false)} title="Lembar spek">
        {detail ? (
          <div className="ds-page pb-8">
            <div className="relative bg-[radial-gradient(ellipse_at_50%_30%,#FBFAF7,#E6E2DA)] px-6 pb-8 pt-10">
              <span className="absolute bottom-8 left-1/2 h-5 w-[55%] -translate-x-1/2 rounded-[50%] bg-[#121410]/30 blur-xl" />
              <Photo product={detail} className="relative mx-auto aspect-[4/3] w-full max-w-[360px]" />
            </div>
            <div className="px-6 pt-6">
              <p className="text-[13px] text-muted">{detail.category}</p>
              <h2 className="mt-0.5 text-[28px] font-bold leading-none">{detail.name}</h2>
              <Mono className="mt-3 block text-[24px] font-semibold">{formatRp(detail.price)}</Mono>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => askAbout(detail)} className="rounded-[8px] bg-[#121410] px-4 py-2.5 text-[14px] font-semibold text-[#F4F3F1] hover:bg-[#262a21]">
                  Tanya AI soal ini
                </button>
                {waLink(storeWa, orderText(detail)) ? (
                  <a
                    href={waLink(storeWa, orderText(detail))!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[8px] px-4 py-2.5 text-[14px] font-semibold shadow-[inset_0_0_0_1px_rgba(18,20,16,0.2)] hover:bg-[#D6E56A]/40"
                  >
                    <WaGlyph size={15} />
                    Pesan via WA
                  </a>
                ) : null}
                <button
                  type="button"
                  disabled={!compareIds.includes(detail.id) && compareIds.length >= COMPARE_MAX}
                  onClick={() => toggleCompare(detail)}
                  className="rounded-[8px] px-3 py-2.5 text-[14px] font-semibold text-muted underline underline-offset-4 hover:text-text disabled:opacity-40"
                >
                  {compareIds.includes(detail.id) ? 'Hapus dari banding' : '+ Bandingkan'}
                </button>
              </div>
              <dl className="mt-8 divide-y divide-[#121410]/10 border-y border-[#121410]/10 font-mono text-[13px]">
                {[
                  ['cpu', <span key="c" className="flex flex-col gap-1"><TierBar value={cpuTier(detail.processor)} label="CPU" />{detail.processor}</span>],
                  ['gpu', <span key="g" className="flex flex-col gap-1"><TierBar value={gpuTier(detail.gpu)} label="GPU" />{detail.gpu}</span>],
                  ['ram', detail.ram],
                  ['storage', detail.storage],
                  ['layar', screenInches(detail.name) ?? 'tidak tercatat'],
                  ['untuk', <span key="u" className="font-grotesk text-[13.5px]">{detail.target_users || 'tidak tercatat'}</span>],
                ].map(([k, v]) => (
                  <div key={k as string} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[13px] leading-relaxed text-muted">
                Resolusi layar, baterai, dan berat belum tercatat. Tanyakan ke AI atau sales; AI tidak akan mengarang angka.
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={compareOpen} onClose={() => setCompareOpen(false)} title="Bandingkan" wide>
        <div className="ds-page overflow-x-auto px-5 pb-8 pt-5">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="w-24" />
                {compareItems.map((p) => (
                  <th key={p.id} className="w-[30%] px-2 pb-4 text-left align-top font-normal">
                    <div className="relative flex h-32 items-center justify-center rounded-[8px] bg-[radial-gradient(ellipse_at_50%_30%,#FBFAF7,#E6E2DA)] p-3">
                      <span className="absolute bottom-4 left-1/2 h-3 w-[55%] -translate-x-1/2 rounded-[50%] bg-[#121410]/25 blur-md" />
                      <Photo product={p} className="relative h-full w-full" />
                    </div>
                    <p className="mt-3 text-[17px] font-bold leading-tight tracking-[-0.02em]">{p.name}</p>
                    <button type="button" onClick={() => toggleCompare(p)} className="mt-1 text-[12px] font-semibold text-muted underline underline-offset-4 hover:text-danger">
                      Hapus
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-[#121410]/10">
                <th className="py-3 text-left align-top font-normal text-muted">harga</th>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-2 py-3 align-top">
                    <span className="text-[15px] font-semibold">{formatRp(p.price)}</span>
                    {p.id === cheapestCompareId ? <Marker className="ml-2 py-0.5 text-[10.5px] font-semibold">termurah</Marker> : null}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-[#121410]/10">
                <th className="py-3 text-left align-top font-normal text-muted">cpu</th>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-2 py-3 align-top">
                    <TierBar value={cpuTier(p.processor)} label="CPU" />
                    <span className="mt-1 block">{p.processor}</span>
                  </td>
                ))}
              </tr>
              <tr className="border-t border-[#121410]/10">
                <th className="py-3 text-left align-top font-normal text-muted">gpu</th>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-2 py-3 align-top">
                    <TierBar value={gpuTier(p.gpu)} label="GPU" />
                    <span className="mt-1 block">{p.gpu}</span>
                  </td>
                ))}
              </tr>
              {(
                [
                  ['ram', (p: PublicProduct) => p.ram],
                  ['storage', (p: PublicProduct) => p.storage],
                  ['layar', (p: PublicProduct) => screenInches(p.name) ?? 'tidak tercatat'],
                ] as const
              ).map(([k, get]) => (
                <tr key={k} className="border-t border-[#121410]/10">
                  <th className="py-3 text-left align-top font-normal text-muted">{k}</th>
                  {compareItems.map((p) => (
                    <td key={p.id} className="px-2 py-3 align-top">
                      {get(p)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-[#121410]/10">
                <th className="py-3 text-left align-top font-normal text-muted">untuk</th>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-2 py-3 align-top font-grotesk text-muted">
                    {p.target_users || 'tidak tercatat'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              prefill(`Tolong bandingkan ${compareItems.map((p) => p.name).join(' vs ')}. Mana yang lebih cocok untuk saya, dan apa bedanya?`)
            }
            className="mt-6 rounded-[8px] bg-[#121410] px-4 py-2.5 text-[14px] font-semibold text-[#F4F3F1] hover:bg-[#262a21]"
          >
            Minta AI bandingkan untuk kebutuhanku
          </button>
        </div>
      </Drawer>
    </div>
  )
}
