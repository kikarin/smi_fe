import { apiFetch } from '@/services/api'
import type { PublicProduct } from '@/types/public'

export type PublicProductQuery = {
  budget_min?: number
  budget_max?: number
  usage?: string
  q?: string
  limit?: number
}

export function fetchPublicProducts(query: PublicProductQuery = {}) {
  const params = new URLSearchParams()
  if (query.budget_min != null) params.set('budget_min', String(query.budget_min))
  if (query.budget_max != null) params.set('budget_max', String(query.budget_max))
  if (query.usage) params.set('usage', query.usage)
  if (query.q) params.set('q', query.q)
  if (query.limit != null) params.set('limit', String(query.limit))
  const qs = params.toString()
  return apiFetch<PublicProduct[]>(`/api/public/products${qs ? `?${qs}` : ''}`, { auth: false })
}
