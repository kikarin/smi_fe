import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { fetchCustomers } from '@/services/customerService'
import {
  fetchConversation,
  fetchConversations,
  sendChatMessage,
} from '@/services/chatService'
import type { ChatMessage } from '@/types'

const STORAGE_KEY = 'salesmind.chat.session'

type ChatSession = {
  customerId: number
  conversationId: number | null
}

function readSession(): ChatSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ChatSession
    if (!parsed?.customerId) return null
    return {
      customerId: Number(parsed.customerId),
      conversationId: parsed.conversationId ? Number(parsed.conversationId) : null,
    }
  } catch {
    return null
  }
}

function writeSession(session: ChatSession | null) {
  if (!session) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function ChatPage() {
  const queryClient = useQueryClient()
  const restoredRef = useRef(false)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(true)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    async function restore() {
      const saved = readSession()
      if (!saved) {
        setRestoring(false)
        return
      }
      setCustomerId(saved.customerId)
      if (!saved.conversationId) {
        setRestoring(false)
        return
      }
      try {
        const detail = await fetchConversation(saved.conversationId)
        setConversationId(detail.id)
        setMessages(detail.messages)
        if (detail.customer_id) setCustomerId(detail.customer_id)
        writeSession({
          customerId: detail.customer_id ?? saved.customerId,
          conversationId: detail.id,
        })
      } catch {
        writeSession({ customerId: saved.customerId, conversationId: null })
        setConversationId(null)
        setMessages([])
      } finally {
        setRestoring(false)
      }
    }

    void restore()
  }, [])

  const chatMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: async (data) => {
      setConversationId(data.conversation_id)
      setMessages(data.messages)
      setProvider(data.provider)
      setError(null)
      if (customerId) {
        writeSession({
          customerId: Number(customerId),
          conversationId: data.conversation_id,
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  async function loadConversation(id: number) {
    const detail = await fetchConversation(id)
    setConversationId(detail.id)
    setMessages(detail.messages)
    if (detail.customer_id) {
      setCustomerId(detail.customer_id)
      writeSession({ customerId: detail.customer_id, conversationId: detail.id })
    }
  }

  async function loadLatestForCustomer(cid: number) {
    try {
      const list = await fetchConversations()
      const latest = list.find((c) => c.customer_id === cid)
      if (latest) {
        await loadConversation(latest.id)
        return
      }
    } catch {
      // ignore — start empty thread
    }
    setConversationId(null)
    setMessages([])
    setProvider(null)
    writeSession({ customerId: cid, conversationId: null })
  }

  function startNewChat() {
    setConversationId(null)
    setMessages([])
    setProvider(null)
    setError(null)
    if (customerId) {
      writeSession({ customerId: Number(customerId), conversationId: null })
    } else {
      writeSession(null)
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || chatMutation.isPending) return
    if (!customerId) {
      setError('Pilih customer dulu sebelum chat (mode demo meeting).')
      return
    }
    setInput('')
    chatMutation.mutate({
      message: text,
      customer_id: Number(customerId),
      conversation_id: conversationId ?? undefined,
    })
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader
        title="Chat (admin demo)"
        description="Impersonate customer untuk tes internal. Pintu customer demo: landing `/` (tanpa login)."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={customerId}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : ''
            setCustomerId(next)
            setError(null)
            if (!next) {
              startNewChat()
              writeSession(null)
              return
            }
            void loadLatestForCustomer(next)
          }}
          className="min-w-[220px] rounded-sm border border-border bg-card px-3 py-2 text-sm outline-none"
        >
          <option value="">Pilih customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={startNewChat}>
          Chat baru
        </Button>
        {provider ? (
          <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-hover">
            Provider: {provider}
          </span>
        ) : null}
        {conversationId ? (
          <button
            type="button"
            className="text-xs font-semibold text-muted underline"
            onClick={() => loadConversation(conversationId)}
          >
            Refresh #{conversationId}
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-[16px] border border-border bg-card">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {restoring ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted">Memuat riwayat chat…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="max-w-sm text-sm text-muted">
                Pilih customer, lalu mulai chat. Rekomendasi dari database (harga Rupiah). Spek
                tambahan (display/baterai) dari Knowledge PDF.
              </p>
              <div className="max-w-md rounded-[12px] border border-dashed border-border bg-bg px-3 py-2 text-left text-[11px] text-faint">
                Contoh: “Budget 10-17 juta untuk ngoding dan gaming” → “Kalo displaynya?” → “Saya
                tertarik, buatkan lead”
              </div>
              {chatMutation.isPending ? (
                <p className="text-xs font-semibold text-muted">AI sedang membalas…</p>
              ) : null}
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.role === 'user'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-[14px] px-3.5 py-2.5 text-sm ${
                      mine
                        ? 'whitespace-pre-wrap bg-text text-white'
                        : 'border border-border bg-sidebar text-text'
                    }`}
                  >
                    {mine ? m.content : <ChatMarkdown content={m.content} />}
                  </div>
                </div>
              )
            })
          )}
          {chatMutation.isPending && messages.length > 0 ? (
            <p className="px-1 text-xs text-muted">AI sedang membalas…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {error ? <p className="px-4 pb-2 text-xs text-danger">{error}</p> : null}

        <div className="flex gap-2 border-t border-divider p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={customerId ? 'Tulis pesan…' : 'Pilih customer dulu…'}
            disabled={!customerId || chatMutation.isPending || restoring}
            className="flex-1 rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none disabled:opacity-60"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!customerId || chatMutation.isPending || restoring}
          >
            {chatMutation.isPending ? '…' : 'Kirim'}
          </Button>
        </div>
      </div>
    </div>
  )
}
