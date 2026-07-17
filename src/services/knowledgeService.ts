import { apiFetch } from './api'
import type { KnowledgeDocument, KnowledgeSearchResponse } from '@/types'

export function fetchKnowledgeDocuments() {
  return apiFetch<KnowledgeDocument[]>('/api/knowledge')
}

export function uploadKnowledgeDocument(file: File, title?: string) {
  const form = new FormData()
  form.append('file', file)
  if (title?.trim()) form.append('title', title.trim())
  return apiFetch<KnowledgeDocument>('/api/knowledge/upload', {
    method: 'POST',
    body: form,
  })
}

export function deleteKnowledgeDocument(id: number) {
  return apiFetch<void>(`/api/knowledge/${id}`, { method: 'DELETE' })
}

export function searchKnowledge(query: string) {
  const q = encodeURIComponent(query)
  return apiFetch<KnowledgeSearchResponse>(`/api/knowledge/search?q=${q}`)
}
