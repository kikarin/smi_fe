import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'

export type DropdownOption = { value: string; label: string; hint?: string }

type MenuPos = { left: number; top?: number; bottom?: number; minWidth: number; maxHeight: number }

export function Dropdown({
  label,
  value,
  options,
  onChange,
  align = 'left',
  size = 'md',
  hideLabel = false,
  placeholder,
  disabled = false,
  className = '',
}: {
  label: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  align?: 'left' | 'right'
  size?: 'sm' | 'md'
  /** Label tetap dibaca screen reader, hanya disembunyikan secara visual. */
  hideLabel?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<MenuPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const current = options.find((o) => o.value === value)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - r.bottom - 12
      const above = r.top - 12
      const flip = below < 220 && above > below
      const maxHeight = Math.min(320, Math.max(160, flip ? above : below))
      setPos({
        left: align === 'right' ? Math.max(8, r.right) : r.left,
        top: flip ? undefined : r.bottom + 6,
        bottom: flip ? window.innerHeight - r.top + 6 : undefined,
        minWidth: r.width,
        maxHeight,
      })
    }
    place()
    const close = () => setOpen(false)
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!rootRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || !pos) return
    const list = listRef.current
    const target =
      list?.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? list?.querySelector<HTMLButtonElement>('button')
    target?.focus({ preventScroll: true })
    if (list && target) list.scrollTop = Math.max(0, target.offsetTop - list.clientHeight / 2)
  }, [open, pos])

  function onListKey(e: ReactKeyboardEvent<HTMLUListElement>) {
    if (e.key === 'Tab') {
      setOpen(false)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  const sm = size === 'sm'

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={hideLabel ? `${label}: ${current?.label ?? placeholder ?? ''}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex w-full items-center gap-2 rounded-[8px] bg-white text-left transition-shadow duration-200 hover:shadow-[inset_0_0_0_1px_rgba(18,20,16,0.4)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_#121410] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] ${
          sm ? 'h-8 pl-2.5 pr-2 text-[13px]' : 'h-9 pl-3 pr-2.5 text-[13.5px]'
        } ${open ? 'shadow-[inset_0_0_0_1.5px_#121410]' : 'shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)]'}`}
      >
        {hideLabel ? null : <span className="shrink-0 text-muted">{label}</span>}
        <span className={`min-w-0 flex-1 truncate ${current ? 'font-semibold' : 'text-faint'}`}>
          {current?.label ?? placeholder ?? 'Pilih'}
        </span>
        <Icon
          name="chevDown"
          size={sm ? 14 : 15}
          stroke={2}
          className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && pos
        ? createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-label={label}
          onKeyDown={onListKey}
          style={{
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            minWidth: pos.minWidth,
            maxHeight: pos.maxHeight,
            transform: align === 'right' ? 'translateX(-100%)' : undefined,
          }}
          className="ds-page fixed z-[60] w-max text-text max-w-[min(420px,calc(100vw-16px))] overflow-y-auto rounded-[8px] bg-white p-1.5 shadow-[0_0_0_1px_rgba(18,20,16,0.08),0_24px_44px_-18px_rgba(18,20,16,0.4)]"
        >
          {options.map((o) => {
            const selected = o.value === value
            return (
              <li key={o.value || '__all'} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                    buttonRef.current?.focus()
                  }}
                  className={`flex w-full items-center justify-between gap-6 rounded-[8px] px-3 py-2 text-left text-[13.5px] outline-none transition-colors duration-150 hover:bg-[#D6E56A]/35 focus-visible:bg-[#D6E56A]/35 ${
                    selected ? 'font-semibold' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.hint ? <span className="block font-mono text-[11px] font-normal text-muted">{o.hint}</span> : null}
                  </span>
                  {selected ? <Icon name="check" size={14} stroke={2.4} /> : <span className="w-3.5 shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>,
            document.body,
          )
        : null}
    </div>
  )
}
