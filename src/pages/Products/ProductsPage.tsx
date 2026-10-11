import { useEffect, useMemo, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Badge,
  ConfirmDelete,
  EmptyState,
  Field,
  IconButton,
  Mono,
  Notice,
  PageHeader,
  Panel,
  PanelBar,
  SearchField,
  SkeletonRows,
  fieldClass,
  tdClass,
  thClass,
  trClass,
} from '@/components/console/kit'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Dropdown } from '@/components/ui/Dropdown'
import { Icon } from '@/components/ui/Icon'
import { formatRp } from '@/lib/format'
import { mediaUrl } from '@/services/api'
import { createProduct, deleteProduct, fetchProducts, updateProduct, uploadProductThumbnail } from '@/services/productService'
import { useAuthStore } from '@/store/authStore'
import type { Product } from '@/types'

function pickImageFile(files: FileList | File[] | null | undefined): File | null {
  if (!files) return null
  return Array.from(files).find((f) => f.type.startsWith('image/')) ?? null
}

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  brand: z.string().min(1, 'Brand wajib diisi'),
  category: z.string().min(1, 'Series wajib diisi'),
  target_users: z.string().min(1, 'Isi minimal satu kebutuhan'),
  price: z.coerce.number({ invalid_type_error: 'Harga harus angka' }).positive('Harga harus lebih dari 0'),
  processor: z.string().min(1, 'Processor wajib diisi'),
  ram: z.string().min(1, 'RAM wajib diisi'),
  storage: z.string().min(1, 'Storage wajib diisi'),
  gpu: z.string().min(1, 'GPU wajib diisi, isi "-" kalau tidak ada'),
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

const FIELDS: { key: keyof FormValues; label: string; wide?: boolean; hint?: string; placeholder?: string }[] = [
  { key: 'name', label: 'Nama produk', wide: true, placeholder: 'ASUS Vivobook S14 OLED' },
  { key: 'category', label: 'Series', placeholder: 'Vivobook' },
  { key: 'brand', label: 'Brand' },
  { key: 'price', label: 'Harga (Rp)', wide: true, hint: 'Angka saja, tanpa titik. Contoh 14999000.' },
  { key: 'processor', label: 'Processor', wide: true, placeholder: 'Intel Core Ultra 5 125H' },
  { key: 'gpu', label: 'GPU', wide: true, placeholder: 'NVIDIA GeForce RTX 4050' },
  { key: 'ram', label: 'RAM' },
  { key: 'storage', label: 'Storage' },
  { key: 'target_users', label: 'Cocok untuk', wide: true, hint: 'Pisahkan dengan koma. Dipakai AI dan filter kebutuhan di landing.', placeholder: 'mahasiswa, office, programming' },
]

function Thumb({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[radial-gradient(ellipse_at_50%_30%,#FBFAF7,#E6E2DA)] ${
        size === 'lg' ? 'h-24 w-32' : 'h-12 w-16'
      }`}
    >
      {src ? (
        <img src={src} alt={name} loading="lazy" className="h-full w-full object-contain p-1" />
      ) : (
        <Icon name="box" size={size === 'lg' ? 22 : 16} className="text-faint" />
      )}
    </span>
  )
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const [editing, setEditing] = useState<Product | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbDragOver, setThumbDragOver] = useState(false)
  const [search, setSearch] = useState('')
  const [series, setSeries] = useState('')

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])

  const thumbPreview = useMemo(() => {
    if (thumbFile) return URL.createObjectURL(thumbFile)
    if (editing?.thumbnail) return mediaUrl(editing.thumbnail)
    return null
  }, [thumbFile, editing?.thumbnail])

  useEffect(() => {
    if (!thumbFile || !thumbPreview) return
    return () => URL.revokeObjectURL(thumbPreview)
  }, [thumbFile, thumbPreview])

  function handleThumbPaste(e: ClipboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (!item.type.startsWith('image/')) continue
      const file = item.getAsFile()
      if (!file) continue
      e.preventDefault()
      setThumbFile(file)
      return
    }
  }

  function handleThumbDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setThumbDragOver(false)
    const file = pickImageFile(e.dataTransfer.files)
    if (file) setThumbFile(file)
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyDefaults })

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
      const saved = editing ? await updateProduct(editing.id, values) : await createProduct(values)
      if (thumbFile) await uploadProductThumbnail(saved.id, thumbFile)
      return saved
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      close()
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: Error) => setListError(err.message),
  })

  function openForm(product: Product | null) {
    setEditing(product)
    setThumbFile(null)
    setError(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setEditing(null)
    setThumbFile(null)
    setError(null)
  }

  const seriesOptions = useMemo(() => {
    const names = [...new Set(products.map((p) => p.category))].sort()
    return [{ value: '', label: 'Semua' }, ...names.map((n) => ({ value: n, label: n }))]
  }, [products])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => !series || p.category === series)
      .filter((p) => !q || [p.name, p.processor, p.gpu, p.category, p.target_users].some((v) => (v || '').toLowerCase().includes(q)))
  }, [products, search, series])

  const prices = products.map((p) => p.price)
  const filtered = search || series

  return (
    <>
      <PageHeader
        meta={
          products.length
            ? `${products.length} laptop, ${formatRp(Math.min(...prices))} sampai ${formatRp(Math.max(...prices))}`
            : undefined
        }
        title="Produk"
        description={
          isAdmin
            ? 'Katalog yang dipakai AI untuk rekomendasi dan tampil di landing. Perubahan harga langsung berlaku di chat berikutnya.'
            : 'Katalog yang dipakai AI dan tampil di landing. Hanya admin yang bisa mengubah.'
        }
        action={
          isAdmin ? (
            <Button type="button" onClick={() => openForm(null)}>
              <Icon name="plus" size={15} stroke={2.2} />
              Tambah produk
            </Button>
          ) : undefined
        }
      />

      {listError ? <Notice onDismiss={() => setListError(null)}>{listError}</Notice> : null}

      <Panel>
        <PanelBar>
          <SearchField label="Cari produk" value={search} onChange={setSearch} placeholder="Cari nama, CPU, GPU" className="w-full sm:w-72" />
          <Dropdown label="Series" value={series} options={seriesOptions} onChange={setSeries} />
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSeries('')
              }}
              className="text-[13px] font-medium text-muted underline-offset-2 hover:text-text hover:underline"
            >
              Hapus filter
            </button>
          ) : null}
          <Mono className="ml-auto text-[12px] text-muted">
            {visible.length} dari {products.length}
          </Mono>
        </PanelBar>

        {productsQuery.isLoading ? (
          <SkeletonRows rows={6} cols={4} />
        ) : productsQuery.isError ? (
          <EmptyState title="Produk gagal dimuat">Coba muat ulang halaman.</EmptyState>
        ) : products.length === 0 ? (
          <EmptyState
            title="Katalog masih kosong"
            action={
              isAdmin ? (
                <Button type="button" onClick={() => openForm(null)}>
                  Tambah produk pertama
                </Button>
              ) : undefined
            }
          >
            Tanpa produk, AI di landing tidak bisa memberi rekomendasi. Jalankan seed katalog di backend atau tambahkan manual.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState title="Tidak ada produk yang cocok">Coba kata kunci lain atau pilih series Semua.</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13.5px]">
              <thead>
                <tr>
                  <th className={thClass}>Produk</th>
                  <th className={thClass}>Spek</th>
                  <th className={thClass}>Cocok untuk</th>
                  <th className={`${thClass} text-right`}>Harga</th>
                  {isAdmin ? (
                    <th className={`${thClass} text-right`}>
                      <span className="sr-only">Aksi</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className={trClass}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3.5">
                        <Thumb src={mediaUrl(p.thumbnail)} name={p.name} />
                        <div className="min-w-0">
                          <div className="font-semibold leading-snug">{p.name}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge>{p.category}</Badge>
                            <Mono className="text-[11.5px] text-faint">#{p.id}</Mono>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}>
                      <dl className="grid grid-cols-[34px_1fr] gap-x-2 gap-y-0.5 font-mono text-[11.5px]">
                        <dt className="text-muted">cpu</dt>
                        <dd>{p.processor}</dd>
                        <dt className="text-muted">gpu</dt>
                        <dd>{p.gpu && p.gpu !== '-' ? p.gpu : <span className="text-faint">terintegrasi</span>}</dd>
                        <dt className="text-muted">mem</dt>
                        <dd>
                          {p.ram}, {p.storage}
                        </dd>
                      </dl>
                    </td>
                    <td className={`${tdClass} max-w-[220px] text-[12.5px] text-muted`}>{p.target_users || '-'}</td>
                    <td className={`${tdClass} whitespace-nowrap text-right`}>
                      <Mono className="font-semibold">{formatRp(p.price)}</Mono>
                    </td>
                    {isAdmin ? (
                      <td className={`${tdClass} w-[1%] whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton icon="pencil" label={`Ubah ${p.name}`} onClick={() => openForm(p)} />
                          <ConfirmDelete
                            itemName={p.name}
                            busy={deleteMutation.isPending && deleteMutation.variables === p.id}
                            onConfirm={() => deleteMutation.mutate(p.id)}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {isAdmin ? (
        <Drawer
          open={open}
          onClose={close}
          title={editing ? 'Ubah produk' : 'Tambah produk'}
          description={editing ? editing.name : 'Produk baru langsung tersedia untuk AI dan katalog landing.'}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={close}>
                Batal
              </Button>
              <Button type="submit" form="product-form" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan' : editing ? 'Simpan perubahan' : 'Simpan produk'}
              </Button>
            </>
          }
        >
          <form
            id="product-form"
            className="flex flex-col gap-5 px-5 py-5"
            onPaste={handleThumbPaste}
            onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
            noValidate
          >
            <div
              tabIndex={0}
              role="group"
              aria-label="Thumbnail produk, tempel atau seret gambar ke sini"
              onPaste={handleThumbPaste}
              onDragOver={(e) => {
                e.preventDefault()
                setThumbDragOver(true)
              }}
              onDragLeave={() => setThumbDragOver(false)}
              onDrop={handleThumbDrop}
              className={`flex items-center gap-4 rounded-[8px] p-3 outline-none transition-[background-color,box-shadow] duration-200 focus-visible:shadow-[inset_0_0_0_1.5px_#121410] ${
                thumbDragOver ? 'bg-[#D6E56A]/30 shadow-[inset_0_0_0_1.5px_#121410]' : 'bg-white shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)]'
              }`}
            >
              <Thumb src={thumbPreview} name="Pratinjau thumbnail" size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold">Thumbnail</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  Seret gambar ke sini, tempel dengan Ctrl+V, atau pilih file. Opsional.
                </p>
                {thumbFile ? <p className="mt-1 truncate font-mono text-[11.5px] text-muted">{thumbFile.name}</p> : null}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-white px-3 text-[13px] font-semibold shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1.5px_#121410] hover:shadow-[inset_0_0_0_1px_rgba(18,20,16,0.4)]">
                    <Icon name="upload" size={14} />
                    Pilih file
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)} />
                  </label>
                  {thumbFile ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setThumbFile(null)}>
                      Batalkan gambar
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {FIELDS.map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint} error={errors[f.key]?.message} className={f.wide ? 'col-span-2' : ''}>
                  <input
                    type={f.key === 'price' ? 'number' : 'text'}
                    inputMode={f.key === 'price' ? 'numeric' : undefined}
                    placeholder={f.placeholder}
                    aria-invalid={errors[f.key] ? true : undefined}
                    className={`${fieldClass} ${f.key === 'price' ? 'font-mono' : ''}`}
                    {...register(f.key)}
                  />
                </Field>
              ))}
            </div>

            {error ? <Notice>{error}</Notice> : null}
          </form>
        </Drawer>
      ) : null}
    </>
  )
}
