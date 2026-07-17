import { apiFetch } from './api'
import type { Customer, CustomerInput } from '@/types'

export function fetchCustomers() {
  return apiFetch<Customer[]>('/api/customers')
}

export function createCustomer(payload: CustomerInput) {
  return apiFetch<Customer>('/api/customers', { method: 'POST', body: payload })
}

export function updateCustomer(id: number, payload: Partial<CustomerInput>) {
  return apiFetch<Customer>(`/api/customers/${id}`, { method: 'PATCH', body: payload })
}

export function deleteCustomer(id: number) {
  return apiFetch<void>(`/api/customers/${id}`, { method: 'DELETE' })
}
