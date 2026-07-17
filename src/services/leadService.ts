import { apiFetch } from './api'
import type { Lead } from '@/types'

export type LeadInput = {
  customer_id: number
  status?: string
  notes?: string | null
}

export type LeadUpdate = {
  status?: string
  notes?: string | null
}

export function fetchLeads() {
  return apiFetch<Lead[]>('/api/leads')
}

export function createLead(payload: LeadInput) {
  return apiFetch<Lead>('/api/leads', { method: 'POST', body: payload })
}

export function updateLead(id: number, payload: LeadUpdate) {
  return apiFetch<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: payload })
}

export function deleteLead(id: number) {
  return apiFetch<void>(`/api/leads/${id}`, { method: 'DELETE' })
}
