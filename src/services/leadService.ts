import { apiFetch } from './api'
import type { Lead } from '@/types'

export type LeadInput = {
  customer_id: number
  status?: string
  notes?: string | null
  source?: string
  assigned_to?: number | null
  product_id?: number | null
}

export type LeadUpdate = {
  status?: string
  notes?: string | null
  assigned_to?: number | null
  product_id?: number | null
  handoff_reason?: string | null
}

export type Assignee = {
  id: number
  name: string
  email: string
  whatsapp: string | null
}

export function fetchLeads() {
  return apiFetch<Lead[]>('/api/leads')
}

export function fetchAssignees() {
  return apiFetch<Assignee[]>('/api/leads/assignees')
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
