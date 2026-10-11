import { Icon } from '@/components/ui/Icon'
import { formatRp } from '@/lib/format'
import { mediaUrl } from '@/services/api'
import type { PublicProduct } from '@/types/public'

export const STAGE = '#121410'
export const LIME = '#D6E56A'

export function isRtx(product: PublicProduct) {
  return /rtx|nvidia|geforce/i.test(product.gpu || '')
}

export function gpuBadge(product: PublicProduct) {
  const match = (product.gpu || '').match(/rtx\s*\d{4}/i)
  return match ? match[0].toUpperCase().replace(/\s+/, ' ') : isRtx(product) ? 'NVIDIA' : null
}

/** Ukuran layar hanya dari angka di nama produk — sama dengan aturan PDF knowledge. */
export function screenInches(name: string) {
  const spaced = name.replace(/([A-Za-z])(\d{2})\b/g, '$1 $2')
  const match = spaced.match(/\b(13|14|15|16|17)\b/)
  return match ? `${match[1]} inch` : null
}

export function useCases(product: PublicProduct, max = 3) {
  return (product.target_users || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
    .join(', ')
}

export function waLink(number: string | null | undefined, text: string) {
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}

export function orderText(product: PublicProduct) {
  return `Halo, saya mau pesan ${product.name} (${formatRp(product.price)}) dari katalog SalesMind. Apakah stoknya tersedia?`
}

export function WaGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.4c.2-.4.5-.4.8-.4h.4c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .5-.1.7l-.5.6c-.1.1-.1.3 0 .5.6 1 1.4 1.8 2.4 2.3.2.1.4.1.5-.1l.6-.6c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.3.3.5 0 .6-.3 1.2-.8 1.5-.6.3-1.4.4-2.7-.1-1.6-.7-3-2-3.9-3.5-.6-1-.8-1.9-.6-2.6.1-.4.2-.8.4-1.3Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Photo({ product, className = '' }: { product: PublicProduct; className?: string }) {
  const src = mediaUrl(product.thumbnail)
  if (!src) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Icon name="box" size={28} className="text-faint" />
      </div>
    )
  }
  return <img src={src} alt={product.name} loading="lazy" className={`object-contain ${className}`} />
}

export { Drawer } from '@/components/ui/Drawer'
