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
  'Budget 14-21 juta, buat ngoding',
  'Laptop gaming di bawah 18 juta',
  'Halo, mau cari laptop untuk editing',
]

export function PublicChatWidget() {
  const [messages, setMessages] = useState<PublicChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, identityOpen, waUrl, refreshOpen])

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
      setProvider(null)
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
      setProvider(data.provider)
      setMessages(data.messages)
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
    <div className="flex h-[min(560px,70vh)] flex-col overflow-hidden rounded-[24px] border border-border bg-bg">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#12151a]">
            <Icon name="sparkles" size={14} stroke={2} className="text-[#EEFF8C]" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#3AA39A] ring-2 ring-card" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">SalesMind AI</p>
            <p className="text-[10.5px] font-medium text-faint">
              {booting ? 'Menghubungkan...' : 'Asisten katalog · tanpa login'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {provider ? (
            <span className="rounded-full bg-brand-light px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide text-brand">
              {provider}
            </span>
          ) : null}
          <button
            type="button"
            title="Mulai chat baru"
            disabled={booting || loading || refreshBusy}
            onClick={requestRefresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-border bg-bg text-muted transition-colors hover:border-brand hover:text-text disabled:opacity-50"
          >
            <Icon name="refresh" size={14} stroke={2} />
          </button>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {booting ? (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
            <span className="ml-1">Memuat percakapan...</span>
          </div>
        ) : null}

        {!booting && messages.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#12151a]">
                <Icon name="sparkles" size={12} className="text-[#EEFF8C]" />
              </div>
              <p className="rounded-[14px] border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-text">
                Halo! Ceritakan budget dan kebutuhanmu.
                {hasIdentity
                  ? ' Data diri sudah tersimpan — saat tertarik langsung masuk ke sales.'
                  : ' Contoh:'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-9">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs font-medium text-text transition-colors hover:border-brand hover:bg-brand-light/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => {
          const mine = m.role === 'user'
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#12151a]">
                  <Icon name="sparkles" size={12} className="text-[#EEFF8C]" />
                </div>
              ) : null}
              <div
                className={`max-w-[80%] rounded-[16px] px-3.5 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? 'rounded-br-[4px] bg-[#12151a] text-white'
                    : 'rounded-bl-[4px] border border-border bg-card text-text'
                }`}
              >
                {mine ? m.content : <ChatMarkdown content={m.content} />}
              </div>
            </div>
          )
        })}

        {waUrl ? (
          <div className="ml-9 rounded-[16px] border border-brand/30 bg-brand-light/40 px-3.5 py-3">
            <p className="mb-2.5 text-xs leading-relaxed text-muted">
              Lanjut tanya ke sales via WhatsApp (belum masuk pipeline lead).
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Icon name="sparkles" size={13} />
              Chat via WhatsApp
            </a>
          </div>
        ) : null}

        {refreshOpen ? (
          <div className="space-y-3 rounded-[16px] border border-border bg-card p-3.5">
            <p className="text-sm font-bold text-text">Mulai chat baru?</p>
            <p className="text-xs leading-relaxed text-muted">
              Riwayat percakapan akan dihapus. Pilih apakah data diri (Nama & WhatsApp) ikut direset
              atau tetap dipakai — jika tetap, saat tertarik langsung masuk leads tanpa isi form
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
                className="rounded-[10px] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
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
                className="rounded-[10px] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
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
            className="ml-9 flex w-[calc(100%-2.25rem)] items-center gap-2 rounded-[16px] border border-brand/40 bg-brand-light/50 px-3.5 py-3 text-left text-sm font-semibold text-brand transition-colors hover:bg-brand-light/70"
          >
            <Icon name="arrowRight" size={14} />
            Isi form Nama & WhatsApp untuk lanjut ke sales
          </button>
        ) : null}

        {identityMsg && !identityOpen ? (
          <p className="ml-9 text-xs text-muted">{identityMsg}</p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#12151a]">
              <Icon name="sparkles" size={12} className="text-[#EEFF8C]" />
            </div>
            <div className="flex items-center gap-1 rounded-[14px] border border-border bg-card px-3.5 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="rounded-[10px] border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <form
        className="flex gap-2 border-t border-border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pesan..."
          disabled={loading || booting}
          className="min-w-0 flex-1 rounded-[10px] border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
        <Button type="submit" disabled={loading || booting || !input.trim()} className="px-4">
          Kirim
        </Button>
      </form>

      {getPublicSessionKey() ? (
        <p className="border-t border-border px-4 py-2 text-[10px] text-faint">
          Session tersimpan di browser
          {hasIdentity ? ' · identitas sudah tertaut' : ''} · tombol refresh untuk mulai chat baru.
        </p>
      ) : null}
    </div>
  )
}