import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ConfirmDelete,
  EmptyState,
  IconButton,
  Mono,
  Notice,
  PageHeader,
  Panel,
  PanelBar,
  SearchField,
  SkeletonRows,
  tdClass,
  thClass,
  trClass,
} from '@/components/console/kit'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { Icon } from '@/components/ui/Icon'
import { formatDate, formatRp } from '@/lib/format'
import { fetchCustomers } from '@/services/customerService'
import { fetchProducts } from '@/services/productService'
import { createQuotation, deleteQuotation, downloadQuotationPdf, fetchQuotations } from '@/services/quotationService'

const QTY_MAX = 99

export function QuotationsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [tried, setTried] = useState(false)
  const [search, setSearch] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [justCreated, setJustCreated] = useState<number | null>(null)
  const leadHint = searchParams.get('lead_id')

  const quotationsQuery = useQuery({ queryKey: ['quotations'], queryFn: fetchQuotations })
  const quotations = useMemo(() => quotationsQuery.data ?? [], [quotationsQuery.data])
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })

  useEffect(() => {
    const c = searchParams.get('customer_id')
    const p = searchParams.get('product_id')
    if (c && !Number.isNaN(Number(c))) setCustomerId(c)
    if (p && !Number.isNaN(Number(p))) setProductId(p)
  }, [searchParams])

  const selectedProduct = useMemo(() => products.find((p) => String(p.id) === productId), [products, productId])
  const previewTotal = selectedProduct ? Number(selectedProduct.price) * qty : 0

  const createMutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: async (q) => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setError(null)
      setQty(1)
      setTried(false)
      setJustCreated(q.id)
      try {
        await downloadQuotationPdf(q.id)
      } catch (err) {
        setError(`Penawaran #${q.id} tersimpan, tapi PDF gagal diunduh: ${err instanceof Error ? err.message : 'coba unduh ulang dari daftar'}.`)
      }
      if (searchParams.has('customer_id') || searchParams.has('lead_id')) setSearchParams({}, { replace: true })
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteQuotation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  useEffect(() => {
    if (!justCreated) return
    const t = window.setTimeout(() => setJustCreated(null), 4000)
    return () => window.clearTimeout(t)
  }, [justCreated])

  async function handleDownload(id: number) {
    try {
      setDownloadingId(id)
      setError(null)
      await downloadQuotationPdf(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF gagal diunduh.')
    } finally {
      setDownloadingId(null)
    }
  }

  function submit() {
    setTried(true)
    if (!customerId || !productId) return
    createMutation.mutate({ customer_id: Number(customerId), product_id: Number(productId), qty })
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...quotations]
      .sort((a, b) => b.id - a.id)
      .filter((x) => !q || [x.customer_name, x.product_name, `#${x.id}`].some((v) => v.toLowerCase().includes(q)))
  }, [quotations, search])

  const totalValue = quotations.reduce((sum, q) => sum + Number(q.grand_total), 0)

  return (
    <>
      <PageHeader
        meta={quotationsQuery.isSuccess && quotations.length ? `${quotations.length} penawaran, total ${formatRp(totalValue)}` : undefined}
        title="Penawaran"
        description="Buat penawaran harga dalam PDF untuk dikirim ke pelanggan. Total dihitung dari harga katalog dikali jumlah unit."
      />

      {error ? <Notice onDismiss={() => setError(null)}>{error}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Panel className="lg:sticky lg:top-24">
          <div className="border-b border-[#121410]/[0.07] px-5 py-4">
            <h2 className="text-[15px] font-semibold">Buat penawaran</h2>
            {leadHint ? (
              <p className="mt-1 text-[12.5px] text-muted">
                Dari lead <Mono>#{leadHint}</Mono>. Lead ini belum punya produk minat, pilih produknya di bawah.
              </p>
            ) : null}
          </div>
          <form
            className="flex flex-col gap-4 px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold">Pelanggan</span>
              <Dropdown
                label="Pelanggan"
                hideLabel
                value={customerId}
                placeholder="Pilih pelanggan"
                options={customers.map((c) => ({ value: String(c.id), label: c.name, hint: c.city || c.whatsapp || undefined }))}
                onChange={setCustomerId}
              />
              {tried && !customerId ? (
                <span role="alert" className="text-[12px] text-danger">
                  Pilih pelanggan dulu.
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold">Produk</span>
              <Dropdown
                label="Produk"
                hideLabel
                value={productId}
                placeholder="Pilih laptop"
                options={products.map((p) => ({ value: String(p.id), label: p.name, hint: `${formatRp(p.price)}, ${p.category}` }))}
                onChange={setProductId}
              />
              {tried && !productId ? (
                <span role="alert" className="text-[12px] text-danger">
                  Pilih produk dulu.
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <span id="qty-label" className="text-[12.5px] font-semibold">
                Jumlah unit
              </span>
              <div role="group" aria-labelledby="qty-label" className="inline-flex w-fit items-center rounded-[8px] bg-white shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)]">
                <button
                  type="button"
                  aria-label="Kurangi"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-l-[8px] text-[16px] text-muted transition-colors duration-200 hover:bg-[#121410]/[0.05] hover:text-text disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  −
                </button>
                <input
                  aria-label="Jumlah unit"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, ''))
                    setQty(Math.min(QTY_MAX, Math.max(1, n || 1)))
                  }}
                  className="h-9 w-12 bg-transparent text-center font-mono text-[14px] font-semibold outline-none"
                />
                <button
                  type="button"
                  aria-label="Tambah"
                  disabled={qty >= QTY_MAX}
                  onClick={() => setQty((q) => Math.min(QTY_MAX, q + 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-r-[8px] text-[16px] text-muted transition-colors duration-200 hover:bg-[#121410]/[0.05] hover:text-text disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  +
                </button>
              </div>
            </div>

            <dl className="mt-1 rounded-[8px] bg-[#FAF9F5] px-4 py-3.5 text-[13px] shadow-[inset_0_0_0_1px_rgba(18,20,16,0.06)]">
              <div className="flex justify-between gap-3 text-muted">
                <dt>Harga satuan</dt>
                <dd>
                  <Mono>{selectedProduct ? formatRp(selectedProduct.price) : '-'}</Mono>
                </dd>
              </div>
              <div className="mt-1.5 flex justify-between gap-3 text-muted">
                <dt>Jumlah</dt>
                <dd>
                  <Mono>{qty} unit</Mono>
                </dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-[#121410]/[0.08] pt-3">
                <dt className="font-semibold text-text">Total</dt>
                <dd>
                  <Mono className={`text-[20px] font-semibold tracking-tight ${selectedProduct ? 'bg-[#D6E56A] px-1' : 'text-faint'}`}>
                    {selectedProduct ? formatRp(previewTotal) : 'Rp -'}
                  </Mono>
                </dd>
              </div>
            </dl>

            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              <Icon name="download" size={15} />
              {createMutation.isPending ? 'Membuat PDF' : 'Buat dan unduh PDF'}
            </Button>
          </form>
        </Panel>

        <Panel>
          <PanelBar className="justify-between">
            <h2 className="text-[15px] font-semibold">Riwayat penawaran</h2>
            {quotations.length ? (
              <SearchField label="Cari penawaran" value={search} onChange={setSearch} placeholder="Cari pelanggan atau produk" className="w-full sm:w-64" />
            ) : null}
          </PanelBar>
          {quotationsQuery.isLoading ? (
            <SkeletonRows rows={4} cols={4} />
          ) : quotationsQuery.isError ? (
            <EmptyState title="Penawaran gagal dimuat">Coba muat ulang halaman.</EmptyState>
          ) : quotations.length === 0 ? (
            <EmptyState title="Belum ada penawaran">
              Isi form di kiri, atau buka Leads dan klik Penawaran PDF di baris lead yang sudah punya produk minat. PDF langsung terunduh dan tercatat di sini.
            </EmptyState>
          ) : visible.length === 0 ? (
            <EmptyState title="Tidak ada yang cocok">Coba kata kunci lain.</EmptyState>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[680px] text-[13.5px]">
                <thead>
                  <tr>
                    <th className={thClass}>Pelanggan</th>
                    <th className={thClass}>Produk</th>
                    <th className={`${thClass} text-right`}>Unit</th>
                    <th className={`${thClass} text-right`}>Total</th>
                    <th className={`${thClass} text-right`}>
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((q) => (
                    <tr key={q.id} className={`${trClass} ${justCreated === q.id ? 'bg-[#D6E56A]/25' : ''}`}>
                      <td className={tdClass}>
                        <div className="font-semibold">{q.customer_name}</div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          <Mono>#{q.id}</Mono>, {formatDate(q.created_at)}
                        </div>
                      </td>
                      <td className={`${tdClass} max-w-[260px]`}>
                        <span className="line-clamp-2">{q.product_name}</span>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <Mono>{q.qty}</Mono>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-right`}>
                        <Mono className="font-semibold">{formatRp(Number(q.grand_total))}</Mono>
                        {q.qty > 1 ? <div className="mt-0.5 font-mono text-[11.5px] text-muted">@ {formatRp(Number(q.price))}</div> : null}
                      </td>
                      <td className={`${tdClass} w-[1%] whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            icon="download"
                            label={downloadingId === q.id ? 'Mengunduh PDF' : `Unduh PDF penawaran #${q.id}`}
                            disabled={downloadingId === q.id}
                            onClick={() => void handleDownload(q.id)}
                          />
                          <ConfirmDelete
                            itemName={`penawaran #${q.id}`}
                            busy={deleteMutation.isPending && deleteMutation.variables === q.id}
                            onConfirm={() => deleteMutation.mutate(q.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
