import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { EmptyState, IconButton, Mono, PageHeader, Panel } from '@/components/console/kit'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { Icon } from '@/components/ui/Icon'
import { formatRelative } from '@/lib/format'
import { fetchCustomers } from '@/services/customerService'
import { fetchConversation, fetchConversations, sendChatMessage } from '@/services/chatService'
import type { ChatMessage } from '@/types'

const STORAGE_KEY = 'salesmind.chat.session'

const PROMPTS = [
  'Budget 10 sampai 17 juta untuk ngoding dan gaming',
  'Layarnya berapa inch dan beratnya berapa?',
  'Saya tertarik, tolong buatkan lead',
]

type ChatSession = { customerId: number; conversationId: number | null }

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
  if (!session) sessionStorage.removeItem(STORAGE_KEY)
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function plainPreview(text: string | null) {
  return (text || '').replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim()
}

export function ChatPage() {
  const queryClient = useQueryClient()
  const restoredRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [customerId, setCustomerId] = useState('')
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [visitorThread, setVisitorThread] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers })
  const conversationsQuery = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations })
  const conversations = conversationsQuery.data ?? []

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    async function restore() {
      const saved = readSession()
      if (!saved) {
        setRestoring(false)
        return
      }
      setCustomerId(String(saved.customerId))
      if (!saved.conversationId) {
        setRestoring(false)
        return
      }
      try {
        const detail = await fetchConversation(saved.conversationId)
        setConversationId(detail.id)
        setMessages(detail.messages)
        if (detail.customer_id) setCustomerId(String(detail.customer_id))
        writeSession({ customerId: detail.customer_id ?? saved.customerId, conversationId: detail.id })
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
      if (customerId) writeSession({ customerId: Number(customerId), conversationId: data.conversation_id })
      await queryClient.invalidateQueries({ queryKey: ['conversations'] })
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: Error) => setError(`Pesan tidak terkirim: ${err.message}`),
  })

  async function loadConversation(id: number) {
    setLoadingThread(true)
    setError(null)
    try {
      const detail = await fetchConversation(id)
      setConversationId(detail.id)
      setMessages(detail.messages)
      setProvider(null)
      setVisitorThread(!detail.customer_id)
      if (detail.customer_id) {
        setCustomerId(String(detail.customer_id))
        writeSession({ customerId: detail.customer_id, conversationId: detail.id })
      }
    } catch (err) {
      setError(err instanceof Error ? `Percakapan gagal dimuat: ${err.message}` : 'Percakapan gagal dimuat.')
    } finally {
      setLoadingThread(false)
    }
  }

  function startNewChat(nextCustomer = customerId) {
    setConversationId(null)
    setMessages([])
    setProvider(null)
    setError(null)
    setVisitorThread(false)
    writeSession(nextCustomer ? { customerId: Number(nextCustomer), conversationId: null } : null)
    inputRef.current?.focus()
  }

  function selectCustomer(next: string) {
    setCustomerId(next)
    setError(null)
    if (!next) {
      startNewChat('')
      return
    }
    const latest = conversations.find((c) => c.customer_id === Number(next))
    if (latest) void loadConversation(latest.id)
    else startNewChat(next)
  }

  function send(text = input) {
    const message = text.trim()
    if (!message || chatMutation.isPending) return
    if (!customerId) {
      setError('Pilih pelanggan dulu. Uji chat selalu berjalan atas nama satu pelanggan.')
      return
    }
    setInput('')
    chatMutation.mutate({ message, customer_id: Number(customerId), conversation_id: conversationId ?? undefined })
  }

  const locked = !customerId || visitorThread || restoring
  const customerName = customers.find((c) => String(c.id) === customerId)?.name

  return (
    <>
      <PageHeader
        title="Uji chat"
        description="Chat dengan AI atas nama pelanggan untuk mengecek rekomendasi, jawaban knowledge, dan pembuatan lead. Pelanggan asli memakai chat di landing tanpa login."
      />

      <div className="grid gap-6 lg:h-[calc(100dvh-286px)] lg:min-h-[560px] lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Panel className="flex max-h-[360px] min-h-0 flex-col lg:max-h-none">
          <div className="flex items-center justify-between gap-3 border-b border-[#121410]/[0.07] px-4 py-3">
            <h2 className="text-[14px] font-semibold">Percakapan</h2>
            <Mono className="text-[12px] text-muted">{conversations.length}</Mono>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {conversationsQuery.isLoading ? (
              <div className="space-y-1.5 p-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="console-skeleton h-14 rounded-[8px]" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-muted">Belum ada percakapan. Pilih pelanggan di kanan dan kirim pesan pertama.</p>
            ) : (
              <ul className="space-y-0.5">
                {conversations.map((c) => {
                  const active = c.id === conversationId
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => void loadConversation(c.id)}
                        aria-current={active || undefined}
                        className={`block w-full rounded-[8px] px-3 py-2.5 text-left transition-colors duration-150 ${
                          active ? 'bg-[#D6E56A]/45' : 'hover:bg-[#121410]/[0.04]'
                        }`}
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-[13.5px] font-semibold ${c.customer_name ? '' : 'text-muted'}`}>
                            {c.customer_name ?? 'Pengunjung landing'}
                          </span>
                          <Mono className="shrink-0 text-[11px] text-muted">{formatRelative(c.created_at)}</Mono>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{plainPreview(c.preview) || 'Belum ada pesan'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Panel>

        <Panel className="flex h-[640px] min-h-0 flex-col lg:h-auto">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#121410]/[0.07] px-4 py-3">
            <Dropdown
              label="Sebagai"
              value={customerId}
              placeholder="pilih pelanggan"
              options={customers.map((c) => ({ value: String(c.id), label: c.name, hint: c.city || undefined }))}
              onChange={selectCustomer}
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => startNewChat()} disabled={!messages.length && !conversationId}>
              <Icon name="plus" size={14} stroke={2.2} />
              Chat baru
            </Button>
            <div className="ml-auto flex items-center gap-1">
              {provider ? <Mono className="text-[11.5px] text-faint">{provider}</Mono> : null}
              {conversationId ? (
                <>
                  <Mono className="px-1 text-[12px] text-muted">#{conversationId}</Mono>
                  <IconButton icon="refresh" label="Muat ulang percakapan" disabled={loadingThread} onClick={() => void loadConversation(conversationId)} />
                </>
              ) : null}
            </div>
          </div>

          {visitorThread ? (
            <p className="border-b border-[#121410]/[0.07] bg-[#FAF9F5] px-4 py-2.5 text-[12.5px] text-muted">
              Percakapan pengunjung landing, hanya bisa dibaca. Pilih pelanggan dan klik Chat baru untuk menguji.
            </p>
          ) : null}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
            {restoring || loadingThread ? (
              <div className="space-y-3">
                <div className="console-skeleton ml-auto h-10 w-2/5 rounded-[16px]" />
                <div className="console-skeleton h-24 w-3/4 rounded-[16px]" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                title={customerId ? `Mulai chat sebagai ${customerName ?? 'pelanggan'}` : 'Pilih pelanggan dulu'}
                action={
                  customerId ? (
                    <div className="flex flex-col items-start gap-1.5">
                      {PROMPTS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          disabled={chatMutation.isPending}
                          onClick={() => send(p)}
                          className="rounded-[8px] px-3 py-2 text-left text-[13px] shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] transition-colors duration-200 hover:bg-[#D6E56A]/35 disabled:opacity-50"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  ) : undefined
                }
              >
                {customerId
                  ? 'Rekomendasi diambil dari tabel produk, spek tambahan dari Knowledge. Coba alur di bawah berurutan untuk menguji sampai lead terbentuk.'
                  : 'Gunakan menu Sebagai di atas. Lead yang terbentuk dari uji chat tercatat atas nama pelanggan itu.'}
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {messages.map((m) => {
                  const mine = m.role === 'user'
                  return (
                    <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[min(80%,640px)] px-4 py-2.5 text-[14px] leading-relaxed ${
                          mine
                            ? 'whitespace-pre-wrap rounded-[16px] rounded-br-[8px] bg-[#121410] text-[#F4F3F1]'
                            : 'rounded-[16px] rounded-bl-[8px] bg-[#FAF9F5] text-text shadow-[inset_0_0_0_1px_rgba(18,20,16,0.07)]'
                        }`}
                      >
                        {mine ? m.content : <ChatMarkdown content={m.content} />}
                      </div>
                    </li>
                  )
                })}
                {chatMutation.isPending ? (
                  <li className="flex justify-start">
                    <span className="inline-flex items-center gap-1 rounded-[16px] rounded-bl-[8px] bg-[#FAF9F5] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(18,20,16,0.07)]" aria-label="AI sedang menulis">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-pulse bg-[#121410]/40" style={{ animationDelay: `${i * 160}ms` }} />
                      ))}
                    </span>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          {error ? (
            <p role="alert" className="px-4 pb-2 text-[12.5px] text-danger sm:px-6">
              {error}
            </p>
          ) : null}

          <form
            className="flex items-end gap-2 border-t border-[#121410]/[0.07] p-3"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <label className="sr-only" htmlFor="admin-chat-input">
              Pesan
            </label>
            <textarea
              id="admin-chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={visitorThread ? 'Hanya baca' : customerId ? 'Tulis pesan, Enter untuk kirim' : 'Pilih pelanggan dulu'}
              disabled={locked || chatMutation.isPending}
              className="min-h-10 flex-1 resize-none rounded-[8px] bg-white px-3 py-2.5 text-[14px] leading-snug shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] outline-none transition-shadow duration-200 placeholder:text-faint focus:shadow-[inset_0_0_0_1.5px_#121410] disabled:cursor-not-allowed disabled:bg-[#FAF9F5]"
            />
            <Button type="submit" className="h-10" disabled={locked || chatMutation.isPending || !input.trim()} aria-label="Kirim pesan">
              <Icon name="send" size={15} />
              <span className="hidden sm:inline">Kirim</span>
            </Button>
          </form>
        </Panel>
      </div>
    </>
  )
}
