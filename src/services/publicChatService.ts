import { apiFetch } from '@/services/api'

export type PublicChatMessage = {
  id: number
  role: string
  content: string
  created_at: string
}

export type IdentityIntent = 'interest' | 'handoff'

export type PublicChatResponse = {
  session_key: string
  conversation_id: number
  reply: string
  provider: string
  messages: PublicChatMessage[]
  needs_identity?: boolean
  needs_handoff?: boolean
  identity_intent?: IdentityIntent | null
  wa_url?: string | null
  product_hint?: string | null
}

export type PublicChatHistoryResponse = {
  session_key: string
  conversation_id: number
  messages: PublicChatMessage[]
  has_identity?: boolean
}

export type PublicIdentityPayload = {
  session_key: string
  name: string
  whatsapp: string
  email?: string
  intent: IdentityIntent
  question?: string
  handoff_reason?: string
}

export type PublicIdentityResponse = {
  customer_id: number
  lead_id: number | null
  assigned_to: number | null
  assignee_name: string | null
  wa_url: string | null
  message: string
}

export type PublicChatResetResponse = {
  session_key: string
  conversation_id: number
  messages: PublicChatMessage[]
  has_identity: boolean
}

const SESSION_KEY = 'salesmind_public_session'

export function getPublicSessionKey(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function setPublicSessionKey(key: string) {
  try {
    localStorage.setItem(SESSION_KEY, key)
  } catch {
    void 0
  }
}

export function clearPublicSessionKey() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    void 0
  }
}

export function fetchPublicChatHistory(session_key: string) {
  const qs = new URLSearchParams({ session_key })
  return apiFetch<PublicChatHistoryResponse>(`/api/public/chat?${qs}`, { auth: false })
}

export function postPublicChat(message: string) {
  const session_key = getPublicSessionKey() || undefined
  return apiFetch<PublicChatResponse>('/api/public/chat', {
    method: 'POST',
    auth: false,
    body: { message, session_key },
  })
}

export function postPublicIdentity(payload: PublicIdentityPayload) {
  return apiFetch<PublicIdentityResponse>('/api/public/identity', {
    method: 'POST',
    auth: false,
    body: payload,
  })
}

export function resetPublicChat(keep_identity: boolean) {
  const session_key = getPublicSessionKey() || undefined
  return apiFetch<PublicChatResetResponse>('/api/public/chat/reset', {
    method: 'POST',
    auth: false,
    body: { session_key, keep_identity },
  })
}
