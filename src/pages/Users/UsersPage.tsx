import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Avatar,
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
  SkeletonRows,
  fieldClass,
  tdClass,
  thClass,
  trClass,
} from '@/components/console/kit'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Icon } from '@/components/ui/Icon'
import { createUser, deleteUser, fetchUsers, updateUser, type ManagedUser } from '@/services/userService'
import { useAuthStore } from '@/store/authStore'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Nama wajib diisi'),
    email: z.string().trim().email('Format email tidak valid'),
    password: z.string().optional(),
    role: z.enum(['admin', 'sales']),
    whatsapp: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\d{9,15}$/.test(v), 'Format 628xx, angka saja tanpa spasi'),
    accepts_leads: z.boolean(),
    is_active: z.boolean(),
    is_new: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.is_new && !val.password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Password wajib diisi untuk akun baru', path: ['password'] })
    } else if (val.password && val.password.length < 6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Password minimal 6 karakter', path: ['password'] })
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
  is_new: true,
}

function Switch({
  registration,
  label,
  description,
  disabled = false,
}: {
  registration: UseFormRegisterReturn
  label: string
  description: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className={`block text-[13.5px] font-semibold ${disabled ? 'text-muted' : ''}`}>{label}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">{description}</span>
      </span>
      <span className={`relative mt-0.5 inline-flex shrink-0 ${disabled ? 'opacity-45' : ''}`}>
        {/* Bukan atribut disabled: react-hook-form mengirim undefined untuk input disabled. */}
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          aria-disabled={disabled || undefined}
          onClick={(e) => {
            if (disabled) e.preventDefault()
          }}
          {...registration}
        />
        <span className="h-6 w-10 rounded-[8px] bg-[#121410]/[0.14] transition-colors duration-200 peer-checked:bg-[#121410] peer-focus-visible:ring-2 peer-focus-visible:ring-[#121410] peer-focus-visible:ring-offset-2" />
        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-[4px] bg-white shadow-[0_1px_2px_rgba(18,20,16,0.3)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] peer-checked:translate-x-4 peer-checked:bg-[#D6E56A]" />
      </span>
    </label>
  )
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const currentUserId = Number(useAuthStore((s) => s.user?.id) || 0)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyDefaults })

  const role = useWatch({ control, name: 'role' })

  useEffect(() => {
    reset(
      editing
        ? {
            name: editing.name,
            email: editing.email,
            password: '',
            role: editing.role === 'admin' ? 'admin' : 'sales',
            whatsapp: editing.whatsapp ?? '',
            accepts_leads: editing.accepts_leads,
            is_active: editing.is_active,
            is_new: false,
          }
        : emptyDefaults,
    )
  }, [editing, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const base = {
        name: values.name,
        email: values.email.toLowerCase(),
        role: values.role,
        whatsapp: values.whatsapp || null,
        accepts_leads: values.role === 'sales' ? values.accepts_leads : false,
        is_active: values.is_active,
      }
      if (editing) return updateUser(editing.id, { ...base, ...(values.password ? { password: values.password } : {}) })
      return createUser({ ...base, password: values.password! })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['lead-assignees'] })
      close()
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['lead-assignees'] })
    },
    onError: (err: Error) => setListError(err.message),
  })

  function openForm(user: ManagedUser | null) {
    setEditing(user)
    setError(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setEditing(null)
    setError(null)
  }

  const salesCount = users.filter((u) => u.role === 'sales').length
  const receiving = users.filter((u) => u.role === 'sales' && u.accepts_leads && u.is_active).length
  const sorted = [...users].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'admin' ? -1 : 1))

  return (
    <>
      <PageHeader
        meta={users.length ? `${users.length} akun, ${receiving} dari ${salesCount} sales menerima lead` : undefined}
        title="Pengguna"
        description="Akun yang bisa masuk console. Lead dari chat landing dibagi otomatis ke sales yang aktif dan menerima lead."
        action={
          <Button type="button" onClick={() => openForm(null)}>
            <Icon name="plus" size={15} stroke={2.2} />
            Tambah pengguna
          </Button>
        }
      />

      {listError ? <Notice onDismiss={() => setListError(null)}>{listError}</Notice> : null}

      {!usersQuery.isLoading && salesCount > 0 && receiving === 0 ? (
        <Notice>Tidak ada sales yang aktif dan menerima lead. Lead baru dari landing tidak akan punya penanggung jawab.</Notice>
      ) : null}

      <Panel>
        <PanelBar>
          <h2 className="text-[15px] font-semibold">Semua akun</h2>
        </PanelBar>
        {usersQuery.isLoading ? (
          <SkeletonRows rows={3} cols={4} />
        ) : usersQuery.isError ? (
          <EmptyState title="Pengguna gagal dimuat">Coba muat ulang halaman.</EmptyState>
        ) : users.length === 0 ? (
          <EmptyState title="Belum ada pengguna" action={<Button onClick={() => openForm(null)}>Tambah pengguna</Button>}>
            Tambahkan sales supaya lead dari landing punya penanggung jawab.
          </EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13.5px]">
              <thead>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>WhatsApp</th>
                  <th className={thClass}>Terima lead</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => {
                  const self = u.id === currentUserId
                  return (
                    <tr key={u.id} className={`${trClass} ${u.is_active ? '' : 'text-muted'}`}>
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold">
                              {u.name}
                              {self ? <Badge tone="lime">akun kamu</Badge> : null}
                            </div>
                            <div className="text-[12.5px] text-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <Badge tone={u.role === 'admin' ? 'ink' : 'outline'}>{u.role}</Badge>
                      </td>
                      <td className={tdClass}>
                        {u.whatsapp ? <Mono className="text-[12.5px]">{u.whatsapp}</Mono> : <span className="text-faint">-</span>}
                      </td>
                      <td className={tdClass}>
                        {u.role !== 'sales' ? (
                          <span className="text-faint">-</span>
                        ) : u.accepts_leads ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="check" size={14} stroke={2.4} />
                            Ya
                          </span>
                        ) : (
                          <span className="text-muted">Tidak</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden className={`h-2 w-2 ${u.is_active ? 'bg-success' : 'bg-[#121410]/25'}`} />
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className={`${tdClass} w-[1%] whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton icon="pencil" label={`Ubah ${u.name}`} onClick={() => openForm(u)} />
                          {self ? (
                            <span className="inline-block w-8" />
                          ) : (
                            <ConfirmDelete
                              itemName={u.name}
                              busy={deleteMutation.isPending && deleteMutation.variables === u.id}
                              onConfirm={() => deleteMutation.mutate(u.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Drawer
        open={open}
        onClose={close}
        title={editing ? 'Ubah pengguna' : 'Tambah pengguna'}
        description={editing ? editing.email : 'Pengguna baru bisa langsung masuk dengan email dan password ini.'}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={close}>
              Batal
            </Button>
            <Button type="submit" form="user-form" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Menyimpan' : editing ? 'Simpan perubahan' : 'Simpan pengguna'}
            </Button>
          </>
        }
      >
        <form
          id="user-form"
          className="flex flex-col gap-4 px-5 py-5"
          noValidate
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[12.5px] font-semibold">Role</legend>
            <div className="grid grid-cols-2 gap-1 rounded-[8px] bg-[#121410]/[0.05] p-1">
              {(['sales', 'admin'] as const).map((r) => (
                <label key={r} className="relative">
                  <input type="radio" value={r} className="peer sr-only" {...register('role')} />
                  <span className="flex h-8 cursor-pointer items-center justify-center rounded-[6px] text-[13px] font-medium text-muted transition-colors duration-200 peer-checked:bg-white peer-checked:font-semibold peer-checked:text-text peer-checked:shadow-[0_1px_2px_rgba(18,20,16,0.12)] peer-focus-visible:ring-2 peer-focus-visible:ring-[#121410]">
                    {r === 'sales' ? 'Sales' : 'Admin'}
                  </span>
                </label>
              ))}
            </div>
            <span className="text-[12px] text-muted">
              {role === 'admin' ? 'Admin bisa mengelola produk, pelanggan, knowledge, dan pengguna.' : 'Sales hanya melihat lead miliknya, penawaran, dan katalog.'}
            </span>
          </fieldset>

          <Field label="Nama" error={errors.name?.message}>
            <input aria-invalid={errors.name ? true : undefined} className={fieldClass} placeholder="Andi Pratama" {...register('name')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" autoComplete="off" aria-invalid={errors.email ? true : undefined} className={fieldClass} placeholder="andi@tokokamu.id" {...register('email')} />
          </Field>
          <Field
            label="Password"
            error={errors.password?.message}
            hint={editing ? 'Kosongkan kalau tidak diganti.' : 'Minimal 6 karakter.'}
          >
            <input
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              className={fieldClass}
              placeholder={editing ? 'Tidak diganti' : ''}
              {...register('password')}
            />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp?.message} hint="Format 628xx. Nomor yang dihubungi saat lead diteruskan ke sales ini.">
            <input inputMode="numeric" aria-invalid={errors.whatsapp ? true : undefined} className={`${fieldClass} font-mono`} placeholder="6281234567890" {...register('whatsapp')} />
          </Field>

          <div className="mt-1 flex flex-col gap-4 rounded-[8px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(18,20,16,0.08)]">
            <Switch
              registration={register('accepts_leads')}
              disabled={role !== 'sales'}
              label="Terima lead"
              description={role === 'sales' ? 'Ikut pembagian otomatis lead dari chat landing.' : 'Hanya berlaku untuk role sales.'}
            />
            <Switch
              registration={register('is_active')}
              disabled={editing?.id === currentUserId}
              label="Akun aktif"
              description={editing?.id === currentUserId ? 'Kamu tidak bisa menonaktifkan akunmu sendiri.' : 'Akun nonaktif tidak bisa masuk console.'}
            />
          </div>

          {error ? <Notice>{error}</Notice> : null}
        </form>
      </Drawer>
    </>
  )
}
