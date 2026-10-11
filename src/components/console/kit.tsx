import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'

export const fieldClass =
  'h-9 w-full rounded-[8px] bg-white px-3 text-[13.5px] text-text shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] outline-none transition-shadow duration-200 placeholder:text-faint hover:shadow-[inset_0_0_0_1px_rgba(18,20,16,0.3)] focus:shadow-[inset_0_0_0_1.5px_#121410] disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_var(--color-danger)]'

export function PageHeader({
  title,
  description,
  meta,
  action,
}: {
  title: string
  description?: ReactNode
  meta?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {meta ? <p className="mb-2 font-mono text-[12px] text-muted">{meta}</p> : null}
        <h1 className="text-[28px] font-semibold leading-[1.1] text-text sm:text-[32px]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted [text-wrap:pretty]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[16px] bg-white shadow-[0_0_0_1px_rgba(18,20,16,0.06),0_30px_60px_-44px_rgba(38,42,33,0.4)] ${className}`}
    >
      {children}
    </section>
  )
}

/** Baris toolbar di atas tabel, warna sama dengan toolbar katalog di landing. */
export function PanelBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-t-[16px] border-b border-[#121410]/[0.07] bg-[#FAF9F5] px-4 py-3 sm:px-5 ${className}`}
    >
      {children}
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  className = '',
}: {
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[12.5px] font-semibold text-text">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[12px] text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{label}</span>
      <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${fieldClass} pl-9`}
        {...rest}
      />
    </label>
  )
}

type BadgeTone = 'neutral' | 'ink' | 'lime' | 'outline' | 'danger'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-[#121410]/[0.06] text-text',
  ink: 'bg-[#121410] text-[#F4F3F1]',
  lime: 'bg-[#D6E56A] text-[#121410]',
  outline: 'text-text shadow-[inset_0_0_0_1px_rgba(18,20,16,0.25)]',
  danger: 'text-danger shadow-[inset_0_0_0_1px_currentColor]',
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 font-mono text-[11px] leading-[1.35] ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{children}</span>
}

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#121410]/[0.06] font-mono text-[11px] font-semibold text-text ${className}`}
    >
      {initials}
    </span>
  )
}

export function Notice({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-[8px] bg-white px-4 py-3 text-[13.5px] text-danger shadow-[inset_0_0_0_1px_currentColor]"
    >
      <span className="min-w-0">{children}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup pesan"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] hover:bg-danger/10"
        >
          <Icon name="x" size={14} stroke={2} />
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="px-6 pb-14 pt-12 sm:px-10">
      <div className="max-w-[46ch]">
        <p className="text-[17px] font-semibold tracking-tight text-text">{title}</p>
        {children ? <div className="mt-2 text-[14px] leading-relaxed text-muted [text-wrap:pretty]">{children}</div> : null}
        {action ? <div className="mt-5 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy="true" aria-label="Memuat data" className="divide-y divide-[#121410]/[0.06]">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-6 px-5 py-4">
          <span className="console-skeleton h-8 w-8 shrink-0 rounded-[8px]" />
          {Array.from({ length: cols }, (_, c) => (
            <span
              key={c}
              className="console-skeleton h-3 rounded-[8px]"
              style={{ width: `${[28, 18, 14, 10, 12][c % 5] + ((r * 7 + c * 3) % 9)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Hapus dua langkah tanpa window.confirm: klik pertama minta konfirmasi, batal otomatis setelah 4 detik. */
export function ConfirmDelete({
  onConfirm,
  label = 'Hapus',
  itemName,
  disabled = false,
  busy = false,
}: {
  onConfirm: () => void
  label?: string
  itemName: string
  disabled?: boolean
  busy?: boolean
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setArmed(false)
            onConfirm()
          }}
          className="inline-flex h-8 items-center rounded-[8px] bg-danger px-2.5 text-[12.5px] font-semibold text-white transition-[filter] duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
          aria-label={`Ya, hapus ${itemName}`}
          autoFocus
        >
          Ya, hapus
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="inline-flex h-8 items-center rounded-[8px] px-2 text-[12.5px] font-semibold text-muted transition-colors duration-200 hover:bg-[#121410]/[0.05] hover:text-text"
        >
          Batal
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => setArmed(true)}
      aria-label={`${label} ${itemName}`}
      title={`${label} ${itemName}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted transition-colors duration-200 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121410] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
    >
      <Icon name="trash" size={15} />
    </button>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: 'pencil' | 'download' | 'external' | 'refresh'
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted transition-colors duration-200 hover:bg-[#121410]/[0.06] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121410] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon name={icon} size={15} />
    </button>
  )
}

/** Header kolom tabel: sentence case, kecil, tanpa huruf kapital semua. */
export const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-[12px] font-medium text-muted first:pl-5 last:pr-5'
export const tdClass = 'px-4 py-3 align-middle first:pl-5 last:pr-5'
export const trClass = 'border-t border-[#121410]/[0.06] transition-colors duration-150 hover:bg-[#D6E56A]/[0.12]'

export const LEAD_STATUS = [
  { value: 'new', label: 'Baru', tone: 'lime' as const },
  { value: 'qualified', label: 'Prospek', tone: 'outline' as const },
  { value: 'won', label: 'Deal', tone: 'ink' as const },
  { value: 'lost', label: 'Batal', tone: 'danger' as const },
]

export function leadStatus(value: string) {
  return LEAD_STATUS.find((s) => s.value === value) ?? { value, label: value, tone: 'neutral' as const }
}
