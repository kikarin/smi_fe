import { apiFetch } from './api'
import type { LoginPayload, LoginResponse } from '@/types'

export function loginRequest(payload: LoginPayload) {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

export function meRequest() {
  return apiFetch<{ user: LoginResponse['user'] }>('/api/auth/me')
}
