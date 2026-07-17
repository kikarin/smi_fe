import { apiFetch } from './api'
import type { ChatResponse, ConversationDetail, ConversationSummary } from '@/types'

export function fetchConversations() {
  return apiFetch<ConversationSummary[]>('/api/ai/conversations')
}

export function fetchConversation(id: number) {
  return apiFetch<ConversationDetail>(`/api/ai/conversations/${id}`)
}

export function sendChatMessage(payload: {
  message: string
  customer_id?: number
  conversation_id?: number
}) {
  return apiFetch<ChatResponse>('/api/ai/chat', {
    method: 'POST',
    body: payload,
  })
}
