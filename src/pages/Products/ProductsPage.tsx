import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { formatRp } from '@/lib/format'
import { mediaUrl } from '@/services/api'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  uploadProductThumbnail,
} from '@/services/productService'
import type { Product } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib'),
  brand: z.string().min(1, 'Brand wajib'),
  category: z.string().min(1, 'Series wajib'),
  target_users: z.string().min(1, 'Target user wajib'),
  price: z.coerce.number().positive('Harga harus > 0'),
  processor: z.string().min(1, 'Processor wajib'),
  ram: z.string().min(1, 'RAM wajib'),
  storage: z.string().min(1, 'Storage wajib'),
  gpu: z.string().min(1, 'GPU wajib'),
})

type FormValues = z.infer<typeof schema>

const emptyDefaults: FormValues = {
  name: '',
  brand: 'ASUS',
  category: 'Vivobook',
  target_users: '',
  price: 0,
  processor: '',
  ram: '16GB',
  storage: '512GB SSD',
  gpu: '-',
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Product | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        brand: editing.brand,
        category: editing.category,
        target_users: editing.target_users || '',
        price: editing.price,
        processor: editing.processor,
        ram: editing.ram,
        storage: editing.storage,
        gpu: editing.gpu,
      })
    } else {
      reset(emptyDefaults)
    }
  }, [editing, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) {
        const updated = await updateProduct(editing.id, values)
        if (thumbFile) await uploadProductThumbnail(updated.id, thumbFile)
        return updated
      }
      const created = await createProduct(values)
      if (thumbFile) await uploadProductThumbnail(created.id, thumbFile)
      return created
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setOpen(false)
      setEditing(null)
      setThumbFile(null)
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  function openCreate() {
    setEditing(null)
    setThumbFile(null)
    setError(null)
    setOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setThumbFile(null)
    setError(null)
    setOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Katalog laptop — harga Rupiah."
        action={
          <Button type="button" onClick={openCreate}>
            <Icon name="plus" size={14} stroke={2.5} />
            Tambah Produk
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted">Memuat produk…</p>
      ) : products.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">Belum ada produk. Jalankan seed atau tambah manual.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-divider bg-sidebar text-xs text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Series</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Spek</th>
                <th className="px-4 py-3 font-semibold">Harga</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const img = mediaUrl(p.thumbnail)
                return (
                  <tr key={p.id} className="border-b border-divider last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-sidebar">
                          {img ? (
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Icon name="box" size={16} className="text-faint" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-text">{p.name}</div>
                          <div className="text-xs text-faint">{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.category}</td>
                    <td className="px-4 py-3 text-xs text-muted">{p.target_users || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {p.processor} · {p.ram} · {p.storage}
                    </td>
                    <td className="px-4 py-3 font-semibold text-text">{formatRp(p.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => openEdit(p)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Hapus ${p.name}?`)) deleteMutation.mutate(p.id)
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[16px] border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-4 text-base font-bold text-text">
              {editing ? 'Edit Produk' : 'Tambah Produk'}
            </h2>
            <form
              className="flex flex-col gap-3"
              onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
            >
              {(
                [
                  ['name', 'Nama'],
                  ['brand', 'Brand'],
                  ['category', 'Series'],
                  ['target_users', 'Target user (pisah koma)'],
                  ['price', 'Harga (Rp)'],
                  ['processor', 'Processor'],
                  ['ram', 'RAM'],
                  ['storage', 'Storage'],
                  ['gpu', 'GPU'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted">{label}</span>
                  <input
                    type={key === 'price' ? 'number' : 'text'}
                    className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                    {...register(key)}
                  />
                  {errors[key] ? (
                    <span className="text-xs text-danger">{errors[key]?.message}</span>
                  ) : null}
                </label>
              ))}

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Thumbnail (opsional)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-muted"
                  onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {error ? <p className="text-xs text-danger">{error}</p> : null}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setOpen(false)
                    setEditing(null)
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
