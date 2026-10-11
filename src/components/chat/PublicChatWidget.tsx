import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ApiError } from '@/services/api'
import {
  fetchPublicChatHistory,
  getPublicSessionKey,
  postPublicChat,
  postPublicIdentity,
  resetPublicChat,
  setPublicSessionKey,
  type IdentityIntent,
  type PublicChatMessage,
} from '@/services/publicChatService'

const SUGGESTIONS = [
  'Budget 15 juta buat ngoding + Docker',
  'Laptop gaming di bawah 18 juta',
  'Editing video, budget 25 juta',
]

export type ChatDraft = { text: string; nonce: number }

export function PublicChatWidget({
  draft,
  className = 'h-[min(600px,74vh)]',
  onMessages,
  onReply,
  formatReply,
  tight = false,
}: {
  draft?: ChatDraft | null
  className?: string
  onMessages?: (messages: PublicChatMessage[]) => void
  /** Hanya dipanggil untuk balasan baru, bukan riwayat yang dimuat ulang. */
  onReply?: (messages: PublicChatMessage[]) => void
  formatReply?: (content: string) => string
  /** Radius hanya 8px dan 16px. */
  tight?: boolean
} = {}) {
  const r = tight
    ? { box: 'rounded-[16px]', bubbleMine: 'rounded-[16px] rounded-br-[8px]', bubbleAi: 'rounded-[16px] rounded-bl-[8px]', sm: 'rounded-[8px]' }
    : { box: 'rounded-[24px]', bubbleMine: 'rounded-[18px] rounded-br-[6px]', bubbleAi: 'rounded-[18px] rounded-bl-[6px]', sm: 'rounded-[10px]' }
  const inputRef = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<PublicChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [identityOpen, setIdentityOpen] = useState(false)
  const [identityIntent, setIdentityIntent] = useState<IdentityIntent>('interest')
  const [hasIdentity, setHasIdentity] = useState(false)
  const [pendingIdentity, setPendingIdentity] = useState(false)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [identityBusy, setIdentityBusy] = useState(false)
  const [identityMsg, setIdentityMsg] = useState<string | null>(null)
  const [waUrl, setWaUrl] = useState<string | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [refreshOpen, setRefreshOpen] = useState(false)
  const [refreshBusy, setRefreshBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const key = getPublicSessionKey()
      if (!key) {
        if (!cancelled) setBooting(false)
        return
      }
      try {
        const data = await fetchPublicChatHistory(key)
        if (cancelled) return
        if (data.messages.length) setMessages(data.messages)
        setHasIdentity(Boolean(data.has_identity))
      } catch {
        if (!cancelled) setError('Gagal memuat riwayat chat')
      } finally {
        if (!cancelled) setBooting(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  const onMessagesRef = useRef(onMessages)
  onMessagesRef.current = onMessages
  useEffect(() => {
    onMessagesRef.current?.(messages)
  }, [messages])

  useEffect(() => {
    const list = bottomRef.current?.parentElement
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, identityOpen, waUrl, refreshOpen])

  useEffect(() => {
    if (!draft) return
    setInput(draft.text)
    inputRef.current?.focus({ preventScroll: true })
  }, [draft])

  function openIdentity(intent: IdentityIntent, question?: string) {
    setIdentityIntent(intent)
    setPendingQuestion(question || null)
    setIdentityMsg(null)
    setPendingIdentity(true)
    setIdentityOpen(true)
  }

  function requestRefresh() {
    if (loading || booting || refreshBusy) return
    if (hasIdentity) {
      setRefreshOpen(true)
      return
    }
    void doRefresh(false)
  }

  async function doRefresh(keepIdentity: boolean) {
    setRefreshBusy(true)
    setError(null)
    try {
      const data = await resetPublicChat(keepIdentity)
      setPublicSessionKey(data.session_key)
      setMessages([])
      setHasIdentity(Boolean(data.has_identity))
      setWaUrl(null)
      setIdentityOpen(false)
      setPendingIdentity(false)
      setIdentityMsg(null)
      setPendingQuestion(null)
      setInput('')
      if (!keepIdentity) {
        setName('')
        setWhatsapp('')
      }
      setRefreshOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Gagal mereset chat')
      } else {
        setError('Tidak dapat terhubung ke server')
      }
    } finally {
      setRefreshBusy(false)
    }
  }

  async function send(text: string) {
    const message = text.trim()
    if (!message || loading || booting) return
    setError(null)
    setLoading(true)
    setInput('')
    const optimistic: PublicChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      const data = await postPublicChat(message)
      setPublicSessionKey(data.session_key)
      setMessages(data.messages)
      onReply?.(data.messages)
      if (data.wa_url) setWaUrl(data.wa_url)
      if (data.needs_identity) {
        openIdentity(data.identity_intent || 'interest', message)
      } else if (data.needs_handoff && data.wa_url) {
        setWaUrl(data.wa_url)
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInput(message)
      if (err instanceof ApiError) {
        setError(err.message || 'Gagal mengirim pesan')
      } else {
        setError('Tidak dapat terhubung ke server')
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitIdentity(e: FormEvent) {
    e.preventDefault()
    const key = getPublicSessionKey()
    if (!key || !name.trim() || !whatsapp.trim()) return
    setIdentityBusy(true)
    setError(null)
    try {
      const data = await postPublicIdentity({
        session_key: key,
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        intent: identityIntent,
        question: pendingQuestion || undefined,
        handoff_reason:
          identityIntent === 'handoff' ? 'Knowledge gap dari public chat' : undefined,
      })
      setHasIdentity(true)
      setIdentityMsg(data.message)
      setIdentityOpen(false)
      setPendingIdentity(false)
      if (data.wa_url) setWaUrl(data.wa_url)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: data.message,
          created_at: new Date().toISOString(),
        },
      ])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Gagal menyimpan identitas')
      } else {
        setError('Tidak dapat terhubung ke server')
      }
    } finally {
      setIdentityBusy(false)
    }
  }

  return (
    <div className={`flex flex-col overflow-hidden ${r.box} bg-[#FBFAF7] ${className}`}>
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-3.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
            SalesMind AI
            <span className="relative flex h-2 w-2">
              {!booting ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9BB81F] opacity-50" />
              ) : null}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${booting ? 'bg-faint' : 'bg-[#9BB81F]'}`} />
            </span>
          </p>
          <p className="truncate text-xs text-muted">
            {booting ? 'Menghubungkan…' : 'Menjawab dari katalog, tanpa login'}
          </p>
        </div>
        <button
          type="button"
          disabled={booting || loading || refreshBusy}
          onClick={requestRefresh}
          className={`inline-flex shrink-0 items-center gap-1.5 ${tight ? 'rounded-[8px]' : 'rounded-[9px]'} px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors duration-200 hover:bg-black/[0.04] hover:text-text disabled:opacity-40`}
        >
          <Icon name="refresh" size={13} stroke={2} />
          Chat baru
        </button>
      </div>

      {/* messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {booting ? (
          <div className="space-y-2">
            <div className={`h-10 w-2/3 animate-pulse ${r.bubbleAi} bg-black/[0.05]`} />
            <div className={`ml-auto h-10 w-1/2 animate-pulse ${r.bubbleMine} bg-black/[0.05]`} />
          </div>
        ) : null}

        {!booting && messages.length === 0 ? (
          <div>
            <p className="max-w-[26ch] text-[22px] font-bold leading-snug tracking-[-0.03em] [text-wrap:balance]">
              Halo. Mau laptop untuk apa, dan budgetnya berapa?
            </p>
            <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-muted">
              {hasIdentity
                ? 'Data diri sudah tersimpan, jadi saat cocok kamu langsung terhubung ke sales.'
                : 'Ketik bebas, atau mulai dari salah satu pertanyaan ini.'}
            </p>
            <ul className="mt-5 divide-y divide-black/[0.06] border-y border-black/[0.06]">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="group flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-text transition-colors duration-200 hover:text-black active:translate-y-px"
                  >
                    {s}
                    <Icon
                      name="arrowRight"
                      size={15}
                      className="shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {messages.map((m) => {
          const mine = m.role === 'user'
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`text-sm leading-relaxed ${
                  mine
                    ? `max-w-[78%] ${r.bubbleMine} bg-[#121410] px-4 py-2.5 text-[#F4F3F1]`
                    : `max-w-[88%] ${r.bubbleAi} bg-white px-4 py-3 text-text [&_li::marker]:!text-[#121410]/35 [&_strong]:font-semibold shadow-[0_1px_0_rgba(36,32,24,0.05),0_10px_24px_-20px_rgba(36,32,24,0.45)]`
                }`}
              >
                {mine ? m.content : <ChatMarkdown content={formatReply ? formatReply(m.content) : m.content} />}
              </div>
            </div>
          )
        })}

        {waUrl ? (
          <div className={`${tight ? 'rounded-[16px]' : 'rounded-[18px]'} bg-[#D6E56A]/35 px-4 py-3.5`}>
            <p className="mb-3 text-[13px] leading-relaxed text-text">
              Mau tanya langsung ke sales? Lanjut lewat WhatsApp.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1.5 ${r.sm} bg-[#121410] px-4 py-2 text-sm font-semibold text-[#F4F3F1] transition-colors duration-200 hover:bg-[#262a21] active:translate-y-px`}
            >
              <Icon name="chat" size={14} stroke={2} />
              Chat via WhatsApp
            </a>
          </div>
        ) : null}

        {refreshOpen ? (
          <div className="space-y-3 rounded-[16px] border border-border bg-card p-3.5">
            <p className="text-sm font-bold text-text">Mulai chat baru?</p>
            <p className="text-xs leading-relaxed text-muted">
              Riwayat percakapan akan dihapus. Pilih apakah data diri (Nama & WhatsApp) ikut direset
              atau tetap dipakai. Jika tetap, saat tertarik langsung masuk leads tanpa isi form
              ulang.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={refreshBusy}
                onClick={() => void doRefresh(false)}
              >
                {refreshBusy ? 'Mereset...' : 'Reset data diri'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={refreshBusy}
                onClick={() => void doRefresh(true)}
              >
                Simpan data diri
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={refreshBusy}
                onClick={() => setRefreshOpen(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        ) : null}

        {identityOpen ? (
          <form
            onSubmit={submitIdentity}
            className="space-y-3 rounded-[16px] border border-border bg-card p-3.5"
          >
            <p className="text-sm font-bold text-text">
              {identityIntent === 'handoff'
                ? 'Isi identitas untuk hubungkan ke sales'
                : 'Isi identitas untuk follow-up'}
            </p>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Nama
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className={`${r.sm} border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10`}
                placeholder="Nama lengkap"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              WhatsApp
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
                minLength={8}
                className={`${r.sm} border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10`}
                placeholder="08... atau 62..."
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={identityBusy || !name.trim() || !whatsapp.trim()}>
                {identityBusy ? 'Menyimpan...' : 'Kirim'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIdentityOpen(false)}>
                Nanti
              </Button>
            </div>
          </form>
        ) : null}

        {!identityOpen && pendingIdentity && !hasIdentity ? (
          <button
            type="button"
            onClick={() => setIdentityOpen(true)}
            className="flex w-full items-center gap-2 rounded-[16px] bg-[#D6E56A]/35 px-4 py-3 text-left text-sm font-semibold text-[#121410] transition-colors duration-200 hover:bg-[#D6E56A]/55"
          >
            <Icon name="arrowRight" size={14} />
            Isi form Nama & WhatsApp untuk lanjut ke sales
          </button>
        ) : null}

        {identityMsg && !identityOpen ? (
          <p className="text-xs text-muted">{identityMsg}</p>
        ) : null}

        {loading ? (
          <div className={`flex w-fit items-center gap-1.5 ${r.bubbleAi} bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(36,32,24,0.05)]`}>
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
            <span className="sr-only">AI sedang mengetik</span>
          </div>
        ) : null}
        {error ? (
          <p className={`${r.sm} bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger`}>{error}</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <form
        className="border-t border-black/[0.06] p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <div className={`flex items-center gap-2 ${tight ? 'rounded-[16px]' : 'rounded-[14px]'} bg-white p-1.5 pl-4 shadow-[inset_0_0_0_1px_rgba(36,32,24,0.1)] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_2px_#121410]`}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis kebutuhan & budget…"
            aria-label="Tulis pesan"
            disabled={loading || booting}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            aria-label="Kirim"
            disabled={loading || booting || !input.trim()}
            className={`inline-flex h-10 items-center gap-1.5 ${r.sm} bg-[#121410] px-4 text-sm font-semibold text-[#D6E56A] transition-[background-color,transform,opacity] duration-200 hover:bg-[#262a21] active:scale-[0.97] disabled:opacity-30`}
          >
            Kirim
            <Icon name="arrowRight" size={14} stroke={2} />
          </button>
        </div>
        {getPublicSessionKey() ? (
          <p className="mt-2 px-1 text-[11px] text-faint">
            Riwayat tersimpan di browser ini{hasIdentity ? ', data diri sudah tertaut' : ''}.
          </p>
        ) : null}
      </form>
    </div>
  )
}