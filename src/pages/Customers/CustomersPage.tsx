import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Avatar,
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
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/format'
import { createCustomer, deleteCustomer, fetchCustomers, updateCustomer } from '@/services/customerService'
import type { Customer } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\+?\d[\d\s-]{7,16}$/.test(v), 'Nomor tidak valid. Contoh 081234567890'),
  email: z.string().trim().email('Format email tidak valid').optional().or(z.literal('')),
  city: z.string().trim().optional(),
})

type FormValues = z.infer<typeof schema>

const emptyDefaults: FormValues = { name: '', whatsapp: '', email: '', city: '' }

function waHref(number: string) {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits.startsWith('0') ? `62${digits.slice(1)}` : digits}`
}

export function CustomersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Customer | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers })
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyDefaults })

  useEffect(() => {
    reset(
      editing
        ? { name: editing.name, whatsapp: editing.whatsapp ?? '', email: editing.email ?? '', city: editing.city ?? '' }
        : emptyDefaults,
    )
  }, [editing, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        whatsapp: values.whatsapp || undefined,
        email: values.email || undefined,
        city: values.city || undefined,
      }
      return editing ? updateCustomer(editing.id, payload) : createCustomer(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      close()
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: Error) => setListError(err.message),
  })

  function openForm(customer: Customer | null) {
    setEditing(customer)
    setError(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setEditing(null)
    setError(null)
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter((c) => !q || [c.name, c.whatsapp, c.email, c.city].some((v) => (v || '').toLowerCase().includes(q)))
  }, [customers, search])

  const withChat = customers.filter((c) => c.conversation_count > 0).length

  return (
    <>
      <PageHeader
        meta={customers.length ? `${customers.length} pelanggan, ${withChat} pernah chat dengan AI` : undefined}
        title="Pelanggan"
        description="Data kontak pelanggan. Pelanggan dari landing tercatat otomatis saat mengisi nama dan WhatsApp di chat."
        action={
          <Button type="button" onClick={() => openForm(null)}>
            <Icon name="plus" size={15} stroke={2.2} />
            Tambah pelanggan
          </Button>
        }
      />

      {listError ? <Notice onDismiss={() => setListError(null)}>{listError}</Notice> : null}

      <Panel>
        <PanelBar>
          <SearchField label="Cari pelanggan" value={search} onChange={setSearch} placeholder="Cari nama, WhatsApp, email, kota" className="w-full sm:w-80" />
          <Mono className="ml-auto text-[12px] text-muted">
            {visible.length} dari {customers.length}
          </Mono>
        </PanelBar>

        {customersQuery.isLoading ? (
          <SkeletonRows rows={4} cols={4} />
        ) : customersQuery.isError ? (
          <EmptyState title="Pelanggan gagal dimuat">Coba muat ulang halaman.</EmptyState>
        ) : customers.length === 0 ? (
          <EmptyState
            title="Belum ada pelanggan"
            action={
              <Button type="button" onClick={() => openForm(null)}>
                Tambah pelanggan
              </Button>
            }
          >
            Pelanggan bertambah otomatis dari chat di landing, atau tambahkan manual untuk pembeli yang datang langsung.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState title="Tidak ada pelanggan yang cocok">Coba kata kunci lain.</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[960px] text-[13.5px]">
              <thead>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>WhatsApp</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Kota</th>
                  <th className={`${thClass} text-right`}>Chat AI</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className={trClass}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} />
                        <div className="min-w-[150px]">
                          <div className="font-semibold">{c.name}</div>
                          <div className="whitespace-nowrap text-[12px] text-muted">sejak {formatDate(c.created_at)}</div>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}>
                      {c.whatsapp ? (
                        <a
                          href={waHref(c.whatsapp)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[12.5px] underline decoration-[#121410]/20 underline-offset-[3px] transition-colors hover:decoration-[#121410]"
                        >
                          {c.whatsapp}
                        </a>
                      ) : (
                        <span className="text-faint">-</span>
                      )}
                    </td>
                    <td className={`${tdClass} text-muted`}>{c.email || <span className="text-faint">-</span>}</td>
                    <td className={`${tdClass} text-muted`}>{c.city || <span className="text-faint">-</span>}</td>
                    <td className={`${tdClass} text-right`}>
                      {c.conversation_count > 0 ? (
                        <Mono className="font-semibold">{c.conversation_count}</Mono>
                      ) : (
                        <span className="text-[12.5px] text-faint">belum</span>
                      )}
                    </td>
                    <td className={`${tdClass} w-[1%] whitespace-nowrap`}>
                      <div className="flex items-center justify-end gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => navigate(`/app/quotations?customer_id=${c.id}`)}>
                          Buat penawaran
                        </Button>
                        <IconButton icon="pencil" label={`Ubah ${c.name}`} onClick={() => openForm(c)} />
                        <ConfirmDelete
                          itemName={c.name}
                          busy={deleteMutation.isPending && deleteMutation.variables === c.id}
                          onConfirm={() => deleteMutation.mutate(c.id)}
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

      <Drawer
        open={open}
        onClose={close}
        title={editing ? 'Ubah pelanggan' : 'Tambah pelanggan'}
        description={editing ? editing.name : 'Hanya nama yang wajib. WhatsApp dipakai sales untuk follow up.'}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={close}>
              Batal
            </Button>
            <Button type="submit" form="customer-form" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Menyimpan' : editing ? 'Simpan perubahan' : 'Simpan pelanggan'}
            </Button>
          </>
        }
      >
        <form id="customer-form" className="flex flex-col gap-4 px-5 py-5" onSubmit={handleSubmit((v) => saveMutation.mutate(v))} noValidate>
          <Field label="Nama" error={errors.name?.message}>
            <input aria-invalid={errors.name ? true : undefined} className={fieldClass} placeholder="Rahmat Hidayat" {...register('name')} />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp?.message} hint="Format 08xx atau 628xx.">
            <input
              inputMode="tel"
              aria-invalid={errors.whatsapp ? true : undefined}
              className={`${fieldClass} font-mono`}
              placeholder="081234567890"
              {...register('whatsapp')}
            />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" aria-invalid={errors.email ? true : undefined} className={fieldClass} placeholder="nama@perusahaan.co.id" {...register('email')} />
          </Field>
          <Field label="Kota">
            <input className={fieldClass} placeholder="Bandung" {...register('city')} />
          </Field>
          {error ? <Notice>{error}</Notice> : null}
        </form>
      </Drawer>
    </>
  )
}
