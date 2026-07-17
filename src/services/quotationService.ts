import { useAuthStore } from '@/store/authStore'
import { apiFetch, ApiError } from './api'
import type { Quotation, QuotationInput } from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function fetchQuotations() {
  return apiFetch<Quotation[]>('/api/quotations')
}

export function createQuotation(payload: QuotationInput) {
  return apiFetch<Quotation>('/api/quotations', { method: 'POST', body: payload })
}

export function deleteQuotation(id: number) {
  return apiFetch<void>(`/api/quotations/${id}`, { method: 'DELETE' })
}

export async function downloadQuotationPdf(id: number, filename?: string) {
  const token = useAuthStore.getState().token
  const res = await fetch(`${BASE_URL}/api/quotations/${id}/pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { detail?: string }
      if (data.detail) message = data.detail
    } catch {
      void 0
    }
    throw new ApiError(res.status, message)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `quotation_${id}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
