import { apiFetch } from './api'
import type { DashboardStats, Product, ProductInput } from '@/types'

export function fetchDashboardStats() {
  return apiFetch<DashboardStats>('/api/dashboard/stats')
}

export function fetchProducts() {
  return apiFetch<Product[]>('/api/products')
}

export function createProduct(payload: ProductInput) {
  return apiFetch<Product>('/api/products', { method: 'POST', body: payload })
}

export function updateProduct(id: number, payload: Partial<ProductInput>) {
  return apiFetch<Product>(`/api/products/${id}`, { method: 'PATCH', body: payload })
}

export function deleteProduct(id: number) {
  return apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' })
}

export function uploadProductThumbnail(id: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<Product>(`/api/products/${id}/thumbnail`, { method: 'POST', body: form })
}
