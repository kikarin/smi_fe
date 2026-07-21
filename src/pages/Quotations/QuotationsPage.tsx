import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { fetchCustomers } from '@/services/customerService'
import { fetchProducts } from '@/services/productService'
import {
  createQuotation,
  deleteQuotation,
  downloadQuotationPdf,
  fetchQuotations,
} from '@/services/quotationService'

function formatRp(value: number) {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`
}

export function QuotationsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [productId, setProductId] = useState<number | ''>('')
  const [qty, setQty] = useState(1)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const leadHint = searchParams.get('lead_id')

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: fetchQuotations,
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  useEffect(() => {
    const c = searchParams.get('customer_id')
    const p = searchParams.get('product_id')
    if (c && !Number.isNaN(Number(c))) setCustomerId(Number(c))
    if (p && !Number.isNaN(Number(p))) setProductId(Number(p))
  }, [searchParams])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  )
  const previewTotal = selectedProduct ? Number(selectedProduct.price) * Math.max(1, qty) : 0

  const createMutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: async (q) => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setError(null)
      setQty(1)
      try {
        await downloadQuotationPdf(q.id)
      } catch {
        void 0
      }
      if (searchParams.has('customer_id') || searchParams.has('lead_id')) {
        setSearchParams({})
      }
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

  async function handleDownload(id: number) {
    try {
      setDownloadingId(id)
      setError(null)
      await downloadQuotationPdf(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal unduh PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Generate & unduh quotation PDF (customer, produk, qty, total Rupiah). Bisa dari Leads."
      />

      <div className="mb-4 rounded-[16px] border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-text">
          Buat quotation
          {leadHint ? (
            <span className="ml-2 text-xs font-normal text-muted">(dari lead #{leadHint})</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-col gap-1 text-xs text-muted">
            Customer
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            >
              <option value="">Pilih...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs text-muted">
            Produk
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            >
              <option value="">Pilih...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {formatRp(Number(p.price))}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-24 flex-col gap-1 text-xs text-muted">
            Qty
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            />
          </label>
          <div className="pb-2 text-sm font-semibold text-text">
            Total: {selectedProduct ? formatRp(previewTotal) : '-'}
          </div>
          <Button
            type="button"
            disabled={!customerId || !productId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                customer_id: Number(customerId),
                product_id: Number(productId),
                qty,
              })
            }
          >
            {createMutation.isPending ? 'Membuat...' : 'Generate PDF'}
          </Button>
        </div>
        {!productId && leadHint ? (
          <p className="mt-2 text-xs text-muted">
            Lead belum punya produk minat - pilih produk lalu Generate PDF.
          </p>
        ) : null}
      </div>

      {error ? <p className="mb-3 text-xs text-danger">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-muted">Memuat quotations...</p>
      ) : quotations.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">
            Belum ada quotation. Buat dari form di atas atau tombol Quotation di halaman Leads.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-divider bg-sidebar text-xs text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3 text-muted">#{q.id}</td>
                  <td className="px-4 py-3 font-semibold text-text">{q.customer_name}</td>
                  <td className="px-4 py-3 text-text">{q.product_name}</td>
                  <td className="px-4 py-3 text-muted">{q.qty}</td>
                  <td className="px-4 py-3 font-semibold text-text">{q.grand_total_label}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={downloadingId === q.id}
                        onClick={() => handleDownload(q.id)}
                      >
                        {downloadingId === q.id ? '...' : 'Download PDF'}
                      </Button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-danger"
                        onClick={() => {
                          if (confirm(`Hapus quotation #${q.id}?`)) deleteMutation.mutate(q.id)
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
