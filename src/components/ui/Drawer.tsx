import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'

export function Drawer({
  open,
  onClose,
  title,
  description,
  wide = false,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  wide?: boolean
  footer?: ReactNode
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return createPortal(
    <div className={`ds-page fixed inset-0 z-50 text-text ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[#121410]/45 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-bg transition-[transform,visibility,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          wide ? 'max-w-[960px]' : 'max-w-[480px]'
        } ${open ? 'visible translate-x-0 shadow-[-30px_0_60px_-30px_rgba(18,20,16,0.5)]' : 'invisible translate-x-full shadow-none'}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.07] px-5 py-3.5">
          <div className="min-w-0 pt-1.5">
            <p className="text-[15px] font-bold tracking-tight">{title}</p>
            {description ? <div className="mt-1 text-[13px] leading-relaxed text-muted">{description}</div> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-muted transition-colors duration-200 hover:bg-black/[0.05] hover:text-text"
          >
            <Icon name="x" size={16} stroke={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-black/[0.07] bg-[#FAF9F5] px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  )
}
