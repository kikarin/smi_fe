import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import {
  createLead,
  deleteLead,
  fetchAssignees,
  fetchLeads,
  updateLead,
} from '@/services/leadService'
import { fetchCustomers } from '@/services/customerService'
import { createQuotation, downloadQuotationPdf } from '@/services/quotationService'
import { useAuthStore } from '@/store/authStore'
import type { Lead } from '@/types'

const PIPELINE = ['new', 'qualified', 'won', 'lost'] as const

export function LeadsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [error, setError] = useState<string | null>(null)
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [newCustomerId, setNewCustomerId] = useState<number | ''>('')
  const [newNotes, setNewNotes] = useState('')
  const [quotingId, setQuotingId] = useState<number | null>(null)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })

  const { data: assignees = [] } = useQuery({
    queryKey: ['lead-assignees'],
    queryFn: fetchAssignees,
    enabled: isAdmin,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      assigned_to,
    }: {
      id: number
      status?: string
      notes?: string | null
      assigned_to?: number | null
    }) => updateLead(id, { status, notes, assigned_to }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setCreateOpen(false)
      setNewCustomerId('')
      setNewNotes('')
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  function notesValue(lead: Lead) {
    return draftNotes[lead.id] ?? lead.notes ?? ''
  }

  async function quoteFromLead(lead: Lead) {
    if (!lead.product_id) {
      navigate(
        `/app/quotations?customer_id=${lead.customer_id}&lead_id=${lead.id}`,
      )
      return
    }
    setQuotingId(lead.id)
    setError(null)
    try {
      const q = await createQuotation({
        customer_id: lead.customer_id,
        product_id: lead.product_id,
        qty: 1,
      })
      await downloadQuotationPdf(q.id)
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal buat quotation')
    } finally {
      setQuotingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Leads' : 'My Leads'}
        description={
          isAdmin
            ? 'Semua lead. Pipeline new / qualified / won / lost. Quotation dari baris lead.'
            : 'Lead yang di-assign ke Anda. Ubah status, catatan, lalu generate quotation PDF.'
        }
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Tambah Lead
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PIPELINE.map((status) => (
          <span
            key={status}
            className="rounded-full bg-brand-light px-3 py-1 text-[11px] font-semibold capitalize text-brand-hover"
          >
            {status}
          </span>
        ))}
        {!isAdmin ? (
          <span className="rounded-full bg-sidebar px-3 py-1 text-[11px] font-semibold text-muted">
            filter: assigned to {user?.name || 'saya'}
          </span>
        ) : null}
      </div>

      {error ? <p className="mb-3 text-xs text-danger">{error}</p> : null}

      {createOpen ? (
        <div className="mb-4 rounded-[16px] border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-text">Lead manual</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[220px] flex-col gap-1 text-xs text-muted">
              Customer
              <select
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value ? Number(e.target.value) : '')}
                className="rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
              >
                <option value="">Pilih customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs text-muted">
              Notes
              <input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
                placeholder="Opsional"
              />
            </label>
            <Button
              type="button"
              disabled={!newCustomerId || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  customer_id: Number(newCustomerId),
                  status: 'new',
                  notes: newNotes || null,
                })
              }
            >
              Simpan
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted">Memuat leads...</p>
      ) : leads.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">
            {isAdmin
              ? 'Belum ada lead. Dari landing chat bilang "Saya tertarik", atau tambah manual.'
              : 'Belum ada lead yang di-assign ke Anda.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-[16px] border border-border bg-card">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-divider bg-sidebar text-xs text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-divider last:border-0">
                  <td className="px-4 py-3 text-muted">#{lead.id}</td>
                  <td className="px-4 py-3 font-semibold text-text">{lead.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sidebar px-2 py-0.5 text-[11px] font-medium text-muted">
                      {lead.source || 'manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={lead.assigned_to ?? ''}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: lead.id,
                            assigned_to: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="max-w-[160px] rounded-sm border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none"
                      >
                        <option value="">Belum assign</option>
                        {assignees.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted">{lead.assignee_name || user?.name || '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{lead.product_name || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        updateMutation.mutate({ id: lead.id, status: e.target.value })
                      }
                      className="rounded-sm border border-border bg-bg px-2 py-1.5 text-xs capitalize text-text outline-none"
                    >
                      {PIPELINE.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[180px] items-center gap-2">
                      <input
                        value={notesValue(lead)}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                        className="w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none"
                        placeholder="Catatan..."
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            id: lead.id,
                            notes: notesValue(lead) || null,
                          })
                        }
                      >
                        Simpan
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        className="text-left text-xs font-semibold text-brand disabled:opacity-50"
                        disabled={quotingId === lead.id}
                        onClick={() => void quoteFromLead(lead)}
                      >
                        {quotingId === lead.id
                          ? 'PDF...'
                          : lead.product_id
                            ? 'Quotation PDF'
                            : 'Quotation...'}
                      </button>
                      <button
                        type="button"
                        className="text-left text-xs font-semibold text-danger"
                        onClick={() => {
                          if (confirm(`Hapus lead #${lead.id}?`)) deleteMutation.mutate(lead.id)
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
