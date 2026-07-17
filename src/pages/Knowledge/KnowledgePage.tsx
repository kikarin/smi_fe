import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { mediaUrl } from '@/services/api'
import {
  deleteKnowledgeDocument,
  fetchKnowledgeDocuments,
  searchKnowledge,
  uploadKnowledgeDocument,
} from '@/services/knowledgeService'

export function KnowledgePage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['knowledge'],
    queryFn: fetchKnowledgeDocuments,
  })

  const searchQuery = useQuery({
    queryKey: ['knowledge-search', searchTerm],
    queryFn: () => searchKnowledge(searchTerm),
    enabled: searchTerm.trim().length > 0,
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pilih file PDF dulu')
      return uploadKnowledgeDocument(file, title)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      setFile(null)
      setTitle('')
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteKnowledgeDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      await queryClient.invalidateQueries({ queryKey: ['knowledge-search'] })
    },
  })

  const uploadLabel = useMemo(() => {
    if (!file) return 'Belum ada file dipilih'
    return `${file.name} (${Math.round(file.size / 1024)} KB)`
  }, [file])

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="Upload PDF katalog, FAQ, dan profil perusahaan (Local Upload)."
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-text">Upload PDF</h2>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">Judul (opsional)</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: FAQ Garansi Laptop"
                className="rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">File PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="text-xs text-muted"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="text-[11px] text-faint">{uploadLabel}</span>
            </label>
            {error ? <p className="text-xs text-danger">{error}</p> : null}
            <Button
              type="button"
              disabled={!file || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              <Icon name="plus" size={14} stroke={2.5} />
              {uploadMutation.isPending ? 'Mengunggah…' : 'Upload PDF'}
            </Button>
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-text">Cari di knowledge</h2>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Contoh: garansi, spek, pengiriman"
              className="flex-1 rounded-sm border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearchTerm(query.trim())
              }}
            />
            <Button type="button" variant="secondary" onClick={() => setSearchTerm(query.trim())}>
              Cari
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {!searchTerm ? (
              <p className="text-xs text-faint">Hasil pencarian muncul di sini (keyword match).</p>
            ) : searchQuery.isLoading ? (
              <p className="text-xs text-muted">Mencari…</p>
            ) : (searchQuery.data?.hits.length ?? 0) === 0 ? (
              <p className="text-xs text-muted">Tidak ada hasil untuk “{searchTerm}”.</p>
            ) : (
              searchQuery.data?.hits.map((hit) => (
                <div key={`${hit.document_id}-${hit.score}`} className="rounded-sm border border-divider p-3">
                  <div className="text-sm font-semibold text-text">{hit.title}</div>
                  <div className="mt-1 text-xs text-muted whitespace-pre-wrap">{hit.snippet}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Memuat dokumen…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">
            Belum ada dokumen. Upload 2–3 PDF demo (katalog, FAQ, company profile).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-divider bg-sidebar text-xs text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">Dokumen</th>
                <th className="px-4 py-3 font-semibold">Extract</th>
                <th className="px-4 py-3 font-semibold">Preview</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const url = mediaUrl(doc.file_url)
                return (
                  <tr key={doc.id} className="border-b border-divider last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text">{doc.title}</div>
                      <div className="text-xs text-faint">{doc.filename}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          doc.has_text
                            ? 'bg-brand-light text-brand-hover'
                            : 'bg-sidebar text-faint'
                        }`}
                      >
                        {doc.has_text ? 'Ada teks' : 'Kosong'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-md">
                      {doc.content_preview || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-sm border border-border bg-card px-3 py-2 text-xs font-semibold text-text"
                          >
                            Lihat / Unduh
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Hapus ${doc.title}?`)) deleteMutation.mutate(doc.id)
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
