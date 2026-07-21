import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
  type ManagedUser,
} from '@/services/userService'
import { useAuthStore } from '@/store/authStore'

const schema = z
  .object({
    name: z.string().min(1, 'Nama wajib'),
    email: z.string().email('Email tidak valid'),
    password: z.string().optional(),
    role: z.enum(['admin', 'sales']),
    whatsapp: z.string().optional(),
    accepts_leads: z.boolean(),
    is_active: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (!val.password) return
    if (val.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password minimal 6 karakter',
        path: ['password'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

const emptyDefaults: FormValues = {
  name: '',
  email: '',
  password: '',
  role: 'sales',
  whatsapp: '',
  accepts_leads: true,
  is_active: true,
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const currentUserId = Number(useAuthStore((s) => s.user?.id) || 0)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  const role = useWatch({ control, name: 'role' })

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        email: editing.email,
        password: '',
        role: editing.role === 'admin' ? 'admin' : 'sales',
        whatsapp: editing.whatsapp ?? '',
        accepts_leads: editing.accepts_leads,
        is_active: editing.is_active,
      })
    } else {
      reset(emptyDefaults)
    }
  }, [editing, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!editing && (!values.password || values.password.length < 6)) {
        throw new Error('Password wajib minimal 6 karakter')
      }
      const base = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        role: values.role,
        whatsapp: values.whatsapp?.trim() || null,
        accepts_leads: values.role === 'sales' ? values.accepts_leads : false,
        is_active: values.is_active,
      }
      if (editing) {
        return updateUser(editing.id, {
          ...base,
          ...(values.password ? { password: values.password } : {}),
        })
      }
      return createUser({ ...base, password: values.password! })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['lead-assignees'] })
      setOpen(false)
      setEditing(null)
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['lead-assignees'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  function openCreate() {
    setEditing(null)
    setError(null)
    setOpen(true)
  }

  function openEdit(user: ManagedUser) {
    setEditing(user)
    setError(null)
    setOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Sales Users"
        description="CRUD user console: admin & sales (WhatsApp, accepts_leads, aktif)."
        action={
          <Button type="button" onClick={openCreate}>
            <Icon name="plus" size={14} stroke={2.5} />
            Tambah User
          </Button>
        }
      />

      {error && !open ? <p className="mb-3 text-xs text-danger">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-muted">Memuat users...</p>
      ) : users.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">Belum ada user. Tambah dari tombol di atas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-[16px] border border-border bg-card">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-divider bg-sidebar text-xs text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">WhatsApp</th>
                <th className="px-4 py-3 font-semibold">Accepts leads</th>
                <th className="px-4 py-3 font-semibold">Aktif</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3 font-semibold text-text">{u.name}</td>
                  <td className="px-4 py-3 text-xs text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sidebar px-2 py-0.5 text-[11px] capitalize text-muted">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{u.whatsapp || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {u.role === 'sales' ? (u.accepts_leads ? 'Ya' : 'Tidak') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{u.is_active ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={u.id === currentUserId || deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Hapus ${u.name}?`)) deleteMutation.mutate(u.id)
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
              {editing ? 'Edit User' : 'Tambah User'}
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
                <span className="text-xs font-semibold text-muted">
                  Password {editing ? '(kosongkan jika tidak diganti)' : ''}
                </span>
                <input
                  type="password"
                  className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  {...register('password')}
                  placeholder={editing ? '••••••••' : 'Minimal 6 karakter'}
                />
                {errors.password ? (
                  <span className="text-xs text-danger">{errors.password.message}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Role</span>
                <select
                  className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  {...register('role')}
                >
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">WhatsApp</span>
                <input
                  className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="62..."
                  {...register('whatsapp')}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  {...register('accepts_leads')}
                  disabled={role !== 'sales'}
                />
                Accepts leads (sales)
              </label>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" {...register('is_active')} />
                Aktif
              </label>

              {error ? <p className="text-xs text-danger">{error}</p> : null}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setOpen(false)
                    setEditing(null)
                    setError(null)
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
