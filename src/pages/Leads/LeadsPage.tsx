import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  ConfirmDelete,
  EmptyState,
  Field,
  LEAD_STATUS,
  Mono,
  Notice,
  PageHeader,
  Panel,
  PanelBar,
  SearchField,
  SkeletonRows,
  fieldClass,
  leadStatus,
  tdClass,
  thClass,
  trClass,
} from '@/components/console/kit'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Dropdown } from '@/components/ui/Dropdown'
import { Icon } from '@/components/ui/Icon'
import { formatDate, formatRelative } from '@/lib/format'
import { createLead, deleteLead, fetchAssignees, fetchLeads, updateLead } from '@/services/leadService'
import { fetchCustomers } from '@/services/customerService'
import { createQuotation, downloadQuotationPdf } from '@/services/quotationService'
import { useAuthStore } from '@/store/authStore'
import type { Lead } from '@/types'

const SOURCE_LABEL: Record<string, string> = {
  web_chat: 'chat landing',
  manual: 'manual',
}

export function LeadsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [error, setError] = useState<string | null>(null)
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({})
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(searchParams.get('baru') === '1')
  const [newCustomerId, setNewCustomerId] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [createTried, setCreateTried] = useState(false)
  const [quotingId, setQuotingId] = useState<number | null>(null)

  useEffect(() => {
    if (searchParams.get('baru') !== '1') return
    setCreateOpen(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: fetchLeads })
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data])
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers })
  const { data: assignees = [] } = useQuery({
    queryKey: ['lead-assignees'],
    queryFn: fetchAssignees,
    enabled: isAdmin,
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['leads'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number; status?: string; notes?: string | null; assigned_to?: number | null }) =>
      updateLead(id, payload),
    onSuccess: async (_data, vars) => {
      await invalidate()
      if (vars.notes !== undefined) {
        setDraftNotes((prev) => {
          const next = { ...prev }
          delete next[vars.id]
          return next
        })
      }
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: async () => {
      await invalidate()
      closeCreate()
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  })

  function closeCreate() {
    setCreateOpen(false)
    setNewCustomerId('')
    setNewNotes('')
    setCreateTried(false)
  }

  function submitCreate() {
    setCreateTried(true)
    if (!newCustomerId) return
    createMutation.mutate({ customer_id: Number(newCustomerId), status: 'new', notes: newNotes.trim() || null })
  }

  const notesValue = (lead: Lead) => draftNotes[lead.id] ?? lead.notes ?? ''
  const notesDirty = (lead: Lead) => lead.id in draftNotes && draftNotes[lead.id] !== (lead.notes ?? '')

  function saveNotes(lead: Lead) {
    if (!notesDirty(lead)) return
    updateMutation.mutate({ id: lead.id, notes: notesValue(lead).trim() || null })
  }

  async function quoteFromLead(lead: Lead) {
    if (!lead.product_id) {
      navigate(`/app/quotations?customer_id=${lead.customer_id}&lead_id=${lead.id}`)
      return
    }
    setQuotingId(lead.id)
    setError(null)
    try {
      const q = await createQuotation({ customer_id: lead.customer_id, product_id: lead.product_id, qty: 1 })
      await downloadQuotationPdf(q.id)
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Penawaran gagal dibuat.')
    } finally {
      setQuotingId(null)
    }
  }

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const l of leads) out[l.status] = (out[l.status] ?? 0) + 1
    return out
  }, [leads])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...leads]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((l) => !statusFilter || l.status === statusFilter)
      .filter(
        (l) =>
          !q ||
          [l.customer_name, l.product_name, l.assignee_name, l.notes, `#${l.id}`]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
      )
  }, [leads, statusFilter, search])

  const assigneeOptions = [{ value: '', label: 'Belum ditugaskan' }, ...assignees.map((a) => ({ value: String(a.id), label: a.name }))]
  const statusOptions = LEAD_STATUS.map((s) => ({ value: s.value, label: s.label }))
  const filterTabs = [{ value: '', label: 'Semua', n: leads.length }, ...LEAD_STATUS.map((s) => ({ ...s, n: counts[s.value] ?? 0 }))]
  const pendingId = updateMutation.isPending ? updateMutation.variables?.id : null

  return (
    <>
      <PageHeader
        meta={leadsQuery.isSuccess ? `${leads.length} lead${counts.new ? `, ${counts.new} baru` : ''}` : undefined}
        title={isAdmin ? 'Leads' : 'Lead saya'}
        description={
          isAdmin
            ? 'Semua lead dari chat landing dan input manual. Tugaskan ke sales, ubah status, lalu buat penawaran PDF dari barisnya.'
            : `Lead yang ditugaskan ke ${user?.name ?? 'kamu'}. Ubah status dan catatan setelah menghubungi pelanggan.`
        }
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={15} stroke={2.2} />
            Tambah lead
          </Button>
        }
      />

      {error ? <Notice onDismiss={() => setError(null)}>{error}</Notice> : null}

      <Panel>
        <PanelBar className={leads.length ? '' : 'hidden'}>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter status">
            {filterTabs.map((t) => {
              const active = statusFilter === t.value
              return (
                <button
                  key={t.value || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(t.value)}
                  className={`inline-flex h-8 items-center gap-2 rounded-[8px] px-3 text-[13px] transition-colors duration-200 ${
                    active ? 'bg-[#121410] font-semibold text-[#D6E56A]' : 'text-muted hover:bg-[#D6E56A]/35 hover:text-text'
                  }`}
                >
                  {t.label}
                  <Mono className={`text-[11.5px] ${active ? 'text-white/60' : 'text-faint'}`}>{t.n}</Mono>
                </button>
              )
            })}
          </div>
          <SearchField
            label="Cari lead"
            value={search}
            onChange={setSearch}
            placeholder="Cari pelanggan, produk, catatan"
            className="ml-auto w-full sm:w-72"
          />
        </PanelBar>

        {leadsQuery.isLoading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : leadsQuery.isError ? (
          <EmptyState title="Lead gagal dimuat">
            {leadsQuery.error instanceof Error ? leadsQuery.error.message : 'Server tidak merespons.'} Coba muat ulang halaman.
          </EmptyState>
        ) : leads.length === 0 ? (
          <EmptyState
            title={isAdmin ? 'Belum ada lead' : 'Belum ada lead untukmu'}
            action={
              isAdmin ? (
                <>
                  <Button type="button" onClick={() => setCreateOpen(true)}>
                    Tambah lead manual
                  </Button>
                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[13.5px] font-semibold text-text transition-colors duration-200 hover:bg-[#121410]/[0.05]"
                  >
                    Coba chat di landing
                    <Icon name="external" size={14} />
                  </a>
                </>
              ) : undefined
            }
          >
            {isAdmin
              ? 'Lead masuk otomatis saat pengunjung landing bilang tertarik dan mengisi nama serta WhatsApp. Untuk pelanggan yang datang lewat telepon atau toko, tambahkan manual.'
              : 'Admin akan menugaskan lead ke kamu, atau sistem membaginya otomatis dari chat landing.'}
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState
            title="Tidak ada lead yang cocok"
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                }}
              >
                Hapus filter
              </Button>
            }
          >
            Coba kata kunci lain atau pilih status Semua.
          </EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[1080px] text-[13.5px]">
              <thead>
                <tr>
                  <th className={thClass}>Pelanggan</th>
                  <th className={thClass}>Produk minat</th>
                  {isAdmin ? <th className={thClass}>Sales</th> : null}
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Catatan</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((lead) => {
                  const s = leadStatus(lead.status)
                  const dirty = notesDirty(lead)
                  const busy = pendingId === lead.id
                  return (
                    <tr key={lead.id} className={trClass}>
                      <td className={tdClass}>
                        <div className="font-semibold">{lead.customer_name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                          <Mono>#{lead.id}</Mono>
                          <span title={formatDate(lead.created_at, true)}>{formatRelative(lead.created_at)}</span>
                          <Badge tone="neutral">{SOURCE_LABEL[lead.source || 'manual'] ?? lead.source}</Badge>
                        </div>
                      </td>
                      <td className={`${tdClass} max-w-[220px]`}>
                        {lead.product_name ? (
                          <span className="line-clamp-2">{lead.product_name}</span>
                        ) : (
                          <span className="whitespace-nowrap text-faint">Belum dipilih</span>
                        )}
                        {lead.handoff_reason ? (
                          <p className="mt-1 line-clamp-2 text-[12px] text-muted" title={lead.handoff_reason}>
                            {lead.handoff_reason}
                          </p>
                        ) : null}
                      </td>
                      {isAdmin ? (
                        <td className={`${tdClass} w-[180px]`}>
                          <Dropdown
                            label={`Sales untuk lead #${lead.id}`}
                            hideLabel
                            size="sm"
                            value={lead.assigned_to ? String(lead.assigned_to) : ''}
                            options={assigneeOptions}
                            disabled={busy}
                            onChange={(v) => updateMutation.mutate({ id: lead.id, assigned_to: v ? Number(v) : null })}
                          />
                        </td>
                      ) : null}
                      <td className={`${tdClass} w-[140px]`}>
                        <div className="flex items-center gap-2">
                          <span aria-hidden className={`h-2 w-2 shrink-0 ${s.tone === 'lime' ? 'bg-[#B8C93E]' : s.tone === 'ink' ? 'bg-[#121410]' : s.tone === 'danger' ? 'bg-danger' : 'bg-[#121410]/35'}`} />
                          <Dropdown
                            label={`Status lead #${lead.id}`}
                            hideLabel
                            size="sm"
                            value={lead.status}
                            options={statusOptions}
                            disabled={busy}
                            onChange={(v) => updateMutation.mutate({ id: lead.id, status: v })}
                          />
                        </div>
                      </td>
                      <td className={`${tdClass} w-[260px]`}>
                        <form
                          className="flex items-center gap-1.5"
                          onSubmit={(e) => {
                            e.preventDefault()
                            saveNotes(lead)
                          }}
                        >
                          <input
                            aria-label={`Catatan lead #${lead.id}`}
                            value={notesValue(lead)}
                            onChange={(e) => setDraftNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key !== 'Escape') return
                              setDraftNotes((prev) => {
                                const next = { ...prev }
                                delete next[lead.id]
                                return next
                              })
                            }}
                            className={`${fieldClass} h-8 text-[13px]`}
                            placeholder="Tambah catatan"
                          />
                          {dirty ? (
                            <Button type="submit" size="sm" disabled={busy}>
                              {busy ? 'Menyimpan' : 'Simpan'}
                            </Button>
                          ) : null}
                        </form>
                      </td>
                      <td className={`${tdClass} w-[1%] whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={quotingId === lead.id}
                            onClick={() => void quoteFromLead(lead)}
                            title={lead.product_id ? 'Buat penawaran dan unduh PDF' : 'Pilih produk dulu di halaman Penawaran'}
                          >
                            <Icon name={lead.product_id ? 'download' : 'doc'} size={14} />
                            {quotingId === lead.id ? 'Membuat PDF' : lead.product_id ? 'Penawaran PDF' : 'Buat penawaran'}
                          </Button>
                          <ConfirmDelete
                            itemName={`lead #${lead.id} (${lead.customer_name})`}
                            busy={deleteMutation.isPending && deleteMutation.variables === lead.id}
                            onConfirm={() => deleteMutation.mutate(lead.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title="Tambah lead"
        description="Untuk pelanggan yang menghubungi lewat telepon, toko, atau WhatsApp langsung. Status awal: Baru."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeCreate}>
              Batal
            </Button>
            <Button type="submit" form="lead-create" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan' : 'Simpan lead'}
            </Button>
          </>
        }
      >
        <form
          id="lead-create"
          className="flex flex-col gap-5 px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault()
            submitCreate()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold">Pelanggan</span>
            <Dropdown
              label="Pelanggan"
              hideLabel
              value={newCustomerId}
              placeholder={customers.length ? 'Pilih pelanggan' : 'Belum ada pelanggan'}
              options={customers.map((c) => ({ value: String(c.id), label: c.name, hint: c.whatsapp || c.city || undefined }))}
              onChange={setNewCustomerId}
            />
            {createTried && !newCustomerId ? (
              <span role="alert" className="text-[12px] text-danger">
                Pilih pelanggan dulu.
              </span>
            ) : (
              <span className="text-[12px] text-muted">
                Pelanggan baru dibuat di halaman Pelanggan.
              </span>
            )}
          </div>
          <Field label="Catatan" hint="Opsional. Misalnya kebutuhan, budget, atau jadwal follow up.">
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={4}
              className={`${fieldClass} h-auto py-2 leading-relaxed`}
              placeholder="Butuh laptop editing, budget sekitar 20 juta"
            />
          </Field>
        </form>
      </Drawer>
    </>
  )
}
