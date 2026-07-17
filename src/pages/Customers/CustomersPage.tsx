import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
} from '@/services/customerService'
import type { Customer } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib'),
  whatsapp: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  city: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const emptyDefaults: FormValues = {
  name: '',
  whatsapp: '',
  email: '',
  city: '',
}

export function CustomersPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Customer | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
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
        whatsapp: editing.whatsapp ?? '',
        email: editing.email ?? '',
        city: editing.city ?? '',
      })
    } else {
      reset(emptyDefaults)
    }
  }, [editing, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        whatsapp: values.whatsapp || undefined,
        email: values.email || undefined,
        city: values.city || undefined,
      }
      if (editing) return updateCustomer(editing.id, payload)
      return createCustomer(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setOpen(false)
      setEditing(null)
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Data pelanggan — nama, WhatsApp, email, kota."
        action={
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setError(null)
              setOpen(true)
            }}
          >
            <Icon name="plus" size={14} stroke={2.5} />
            Tambah Customer
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted">Memuat customer…</p>
      ) : customers.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">Belum ada customer.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-divider bg-sidebar text-xs text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">WhatsApp</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Kota</th>
                <th className="px-4 py-3 font-semibold">Chat</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3 font-semibold text-text">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.whatsapp || '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.city || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.conversation_count > 0
                      ? `${c.conversation_count} percakapan`
                      : 'Belum ada (Fase 5)'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditing(c)
                          setError(null)
                          setOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Hapus ${c.name}?`)) deleteMutation.mutate(c.id)
                        }}
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[16px] border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-4 text-base font-bold text-text">
              {editing ? 'Edit Customer' : 'Tambah Customer'}
            </h2>
            <form
              className="flex flex-col gap-3"
              onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Nama</span>
                <input
                  className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  {...register('name')}
                />
                {errors.name ? (
                  <span className="text-xs text-danger">{errors.name.message}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">WhatsApp</span>
                <input
                  className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="08xxxxxxxxxx"
                  {...register('whatsapp')}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Email</span>
                <input
                  type="email"
                  className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  {...register('email')}
                />
                {errors.email ? (
                  <span className="text-xs text-danger">{errors.email.message}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Kota</span>
                <input
                  className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  {...register('city')}
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
