export type ChatMessage = {
  id: number
  role: 'user' | 'assistant' | 'system' | string
  content: string
  created_at: string
}

export type ConversationSummary = {
  id: number
  customer_id: number | null
  customer_name: string | null
  created_at: string
  preview: string | null
}

export type ConversationDetail = {
  id: number
  customer_id: number | null
  customer_name: string | null
  created_at: string
  messages: ChatMessage[]
}

export type ChatResponse = {
  conversation_id: number
  reply: string
  provider: string
  messages: ChatMessage[]
}

export type Lead = {
  id: number
  customer_id: number
  customer_name: string
  status: string
  source?: string
  assigned_to?: number | null
  assignee_name?: string | null
  product_id?: number | null
  product_name?: string | null
  handoff_reason?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
