import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'lime' | 'danger'
type Size = 'sm' | 'md'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const styles: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-hover',
  secondary:
    'bg-white text-text shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] hover:shadow-[inset_0_0_0_1px_rgba(18,20,16,0.4)]',
  ghost: 'bg-transparent text-muted hover:bg-[#121410]/[0.05] hover:text-text',
  lime: 'bg-[#D6E56A] text-[#121410] shadow-[inset_0_0_0_1px_rgba(18,20,16,0.12)] hover:brightness-95',
  danger: 'bg-danger text-white hover:brightness-95',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-[13.5px]',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-[8px] font-semibold transition-[background-color,box-shadow,filter,transform,color] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121410] focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
