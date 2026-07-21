import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ApiError } from '@/services/api'
import { loginRequest } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const setSession = useAuthStore((s) => s.setSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'superadmin@gmail.com', password: '' },
  })

  if (token) return <Navigate to="/app" replace />

  async function onSubmit(values: FormValues) {
    setError(null)
    setLoading(true)
    try {
      const data = await loginRequest(values)
      setSession(data.access_token, data.user)
      navigate('/app', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Login gagal')
      } else {
        setError('Tidak dapat terhubung ke server. Pastikan backend berjalan di :8000')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-[18px] border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-text">
            <Icon name="sparkles" size={18} stroke={2} className="text-highlight" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">SalesMind AI</h1>
            <p className="text-sm text-muted">Masuk console (admin / sales)</p>
          </div>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Email</span>
            <input
              type="email"
              autoComplete="username"
              className="rounded-sm border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-brand"
              {...register('email')}
            />
            {errors.email ? <span className="text-xs text-danger">{errors.email.message}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="rounded-sm border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-brand"
              {...register('password')}
            />
            {errors.password ? (
              <span className="text-xs text-danger">{errors.password.message}</span>
            ) : null}
          </label>

          {error ? <p className="text-xs text-danger">{error}</p> : null}

          <Button type="submit" disabled={loading} className="mt-2 w-full py-2.5">
            {loading ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>

        <p className="mt-3 text-center text-[11px]">
          <a href="/" className="text-muted underline-offset-2 hover:text-text hover:underline">
            Kembali ke landing
          </a>
        </p>
      </div>
    </div>
  )
}
