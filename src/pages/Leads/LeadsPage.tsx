import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { createLead, deleteLead, fetchLeads, updateLead } from '@/services/leadService'
import { fetchCustomers } from '@/services/customerService'
import type { Lead } from '@/types'

const PIPELINE = ['new', 'qualified', 'won', 'lost'] as const

export function LeadsPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [newCustomerId, setNewCustomerId] = useState<number | ''>('')
  const [newNotes, setNewNotes] = useState('')

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status?: string; notes?: string | null }) =>
      updateLead(id, { status, notes }),
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

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Pipeline: new → qualified → won / lost. Lead juga dibuat otomatis dari Chat AI."
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
                <option value="">Pilih customer…</option>
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
        <p className="text-sm text-muted">Memuat leads…</p>
      ) : leads.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">
            Belum ada lead. Dari Chat AI bilang “Saya tertarik”, atau tambah manual.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-divider bg-sidebar text-xs text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
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
                    <div className="flex min-w-[200px] items-center gap-2">
                      <input
                        value={notesValue(lead)}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                        className="w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none"
                        placeholder="Catatan…"
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
                    <button
                      type="button"
                      className="text-xs font-semibold text-danger"
                      onClick={() => {
                        if (confirm(`Hapus lead #${lead.id}?`)) deleteMutation.mutate(lead.id)
                      }}
                    >
                      Hapus
                    </button>
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
