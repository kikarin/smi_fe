import { apiFetch } from './api'

export type ManagedUser = {
  id: number
  email: string
  name: string
  role: string
  whatsapp: string | null
  accepts_leads: boolean
  is_active: boolean
  created_at: string
}

export type ManagedUserCreate = {
  email: string
  name: string
  password: string
  role: 'admin' | 'sales'
  whatsapp?: string | null
  accepts_leads?: boolean
  is_active?: boolean
}

export type ManagedUserUpdate = {
  email?: string
  name?: string
  password?: string
  role?: 'admin' | 'sales'
  whatsapp?: string | null
  accepts_leads?: boolean
  is_active?: boolean
}

export function fetchUsers() {
  return apiFetch<ManagedUser[]>('/api/users')
}

export function createUser(payload: ManagedUserCreate) {
  return apiFetch<ManagedUser>('/api/users', { method: 'POST', body: payload })
}

export function updateUser(id: number, payload: ManagedUserUpdate) {
  return apiFetch<ManagedUser>(`/api/users/${id}`, { method: 'PATCH', body: payload })
}

export function deleteUser(id: number) {
  return apiFetch<{ message: string }>(`/api/users/${id}`, { method: 'DELETE' })
}
