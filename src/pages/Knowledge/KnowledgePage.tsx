import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  ConfirmDelete,
  EmptyState,
  Field,
  Mono,
  Notice,
  PageHeader,
  Panel,
  PanelBar,
  SearchField,
  SkeletonRows,
  fieldClass,
  tdClass,
  thClass,
  trClass,
} from '@/components/console/kit'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/format'
import { mediaUrl } from '@/services/api'
import { deleteKnowledgeDocument, fetchKnowledgeDocuments, searchKnowledge, uploadKnowledgeDocument } from '@/services/knowledgeService'

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function highlight(text: string, term: string): ReactNode {
  const words = term
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!words.length) return text
  const re = new RegExp(`(${words.join('|')})`, 'gi')
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-[#D6E56A] px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

const SEARCH_EXAMPLES = ['garansi', 'baterai', 'berat', 'layar OLED']

export function KnowledgePage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [docFilter, setDocFilter] = useState('')

  const docsQuery = useQuery({ queryKey: ['knowledge'], queryFn: fetchKnowledgeDocuments })
  const documents = useMemo(() => docsQuery.data ?? [], [docsQuery.data])

  const searchQuery = useQuery({
    queryKey: ['knowledge-search', searchTerm],
    queryFn: () => searchKnowledge(searchTerm),
    enabled: searchTerm.length > 0,
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pilih file PDF dulu.')
      return uploadKnowledgeDocument(file, title.trim())
    },
    onSuccess: async (doc) => {
      await queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      setUploaded(doc?.title ?? file?.name ?? 'Dokumen')
      setFile(null)
      setTitle('')
      setUploadError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: Error) => setUploadError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteKnowledgeDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      await queryClient.invalidateQueries({ queryKey: ['knowledge-search'] })
    },
    onError: (err: Error) => setListError(err.message),
  })

  function pickFile(next: File | null | undefined) {
    setUploaded(null)
    if (!next) return
    if (!isPdf(next)) {
      setUploadError(`${next.name} bukan PDF. Hanya file PDF yang bisa dibaca AI.`)
      return
    }
    setUploadError(null)
    setFile(next)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  function runSearch(term: string) {
    setQuery(term)
    setSearchTerm(term.trim())
  }

  const visibleDocs = useMemo(() => {
    const q = docFilter.trim().toLowerCase()
    return [...documents]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((d) => !q || [d.title, d.filename].some((v) => v.toLowerCase().includes(q)))
  }, [documents, docFilter])

  const noText = documents.filter((d) => !d.has_text).length
  const hits = searchQuery.data?.hits ?? []

  return (
    <>
      <PageHeader
        meta={documents.length ? `${documents.length} dokumen${noText ? `, ${noText} tanpa teks terbaca` : ', semua teks terbaca'}` : undefined}
        title="Knowledge"
        description="PDF yang dibaca AI untuk menjawab hal di luar tabel produk, seperti layar, baterai, berat, garansi, dan pengiriman."
      />

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel>
          <div className="border-b border-[#121410]/[0.07] px-5 py-4">
            <h2 className="text-[15px] font-semibold">Unggah PDF</h2>
          </div>
          <form
            className="flex flex-col gap-4 px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault()
              uploadMutation.mutate()
            }}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-start gap-3 rounded-[8px] px-4 py-5 transition-[background-color,box-shadow] duration-200 ${
                dragOver ? 'bg-[#D6E56A]/30 shadow-[inset_0_0_0_1.5px_#121410]' : 'bg-[#FAF9F5] shadow-[inset_0_0_0_1px_rgba(18,20,16,0.12)]'
              }`}
            >
              {file ? (
                <div className="flex w-full items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#121410] font-mono text-[10px] font-semibold text-[#D6E56A]">
                    PDF
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{file.name}</p>
                    <Mono className="text-[12px] text-muted">{Math.max(1, Math.round(file.size / 1024))} KB</Mono>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFile(null)}>
                    Ganti
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-[13.5px] leading-relaxed text-muted">
                    Seret file PDF ke sini, atau pilih dari komputer. PDF hasil scan (gambar) tidak bisa dibaca AI.
                  </p>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-white px-3 text-[13px] font-semibold shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1.5px_#121410] hover:shadow-[inset_0_0_0_1px_rgba(18,20,16,0.4)]">
                    <Icon name="upload" size={14} />
                    Pilih PDF
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                  </label>
                </>
              )}
            </div>

            <Field label="Judul" hint="Opsional. Kosongkan untuk memakai nama file.">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="FAQ garansi dan servis" className={fieldClass} />
            </Field>

            {uploadError ? (
              <p role="alert" className="text-[12.5px] text-danger">
                {uploadError}
              </p>
            ) : uploaded ? (
              <p role="status" className="text-[12.5px] text-success">
                {uploaded} sudah diunggah dan masuk daftar di bawah.
              </p>
            ) : null}

            <Button type="submit" disabled={!file || uploadMutation.isPending} className="w-full">
              {uploadMutation.isPending ? 'Mengunggah' : 'Unggah dokumen'}
            </Button>
          </form>
        </Panel>

        <Panel className="flex min-h-full flex-col">
          <div className="border-b border-[#121410]/[0.07] px-5 py-4">
            <h2 className="text-[15px] font-semibold">Uji pencarian AI</h2>
            <p className="mt-1 text-[12.5px] text-muted">Pencarian kata kunci yang sama dengan yang dipakai AI saat menjawab chat.</p>
          </div>
          <div className="px-5 py-5">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                runSearch(query)
              }}
            >
              <SearchField label="Kata kunci" value={query} onChange={setQuery} placeholder="garansi, baterai, berat Zenbook" className="flex-1" />
              <Button type="submit" variant="secondary" disabled={!query.trim()}>
                Cari
              </Button>
            </form>

            <div className="mt-4" aria-live="polite">
              {!searchTerm ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
                  Coba:
                  {SEARCH_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => runSearch(ex)}
                      className="rounded-[8px] px-2 py-1 font-mono text-[12px] text-text shadow-[inset_0_0_0_1px_rgba(18,20,16,0.14)] transition-colors duration-200 hover:bg-[#D6E56A]/35"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              ) : searchQuery.isLoading ? (
                <div className="space-y-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="console-skeleton h-[72px] rounded-[8px]" />
                  ))}
                </div>
              ) : searchQuery.isError ? (
                <p role="alert" className="text-[13px] text-danger">
                  Pencarian gagal. Coba lagi.
                </p>
              ) : hits.length === 0 ? (
                <p className="text-[13.5px] text-muted">
                  Tidak ada dokumen yang memuat “{searchTerm}”. AI akan menjawab tidak tahu dan menawarkan sales lewat WhatsApp.
                </p>
              ) : (
                <>
                  <p className="mb-2 font-mono text-[12px] text-muted">
                    {hits.length} hasil untuk “{searchTerm}”
                  </p>
                  <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                    {hits.map((hit) => (
                      <li key={`${hit.document_id}-${hit.score}`} className="rounded-[8px] bg-[#FAF9F5] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(18,20,16,0.06)]">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-[13.5px] font-semibold">{hit.title}</p>
                          <Mono className="shrink-0 text-[11px] text-muted">skor {Number(hit.score).toFixed(1).replace('.', ',')}</Mono>
                        </div>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">{highlight(hit.snippet, searchTerm)}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {listError ? <Notice onDismiss={() => setListError(null)}>{listError}</Notice> : null}

      <Panel>
        <PanelBar className="justify-between">
          <h2 className="text-[15px] font-semibold">Dokumen</h2>
          {documents.length ? (
            <SearchField label="Saring dokumen" value={docFilter} onChange={setDocFilter} placeholder="Saring judul atau nama file" className="w-full sm:w-64" />
          ) : null}
        </PanelBar>
        {docsQuery.isLoading ? (
          <SkeletonRows rows={5} cols={3} />
        ) : docsQuery.isError ? (
          <EmptyState title="Dokumen gagal dimuat">Coba muat ulang halaman.</EmptyState>
        ) : documents.length === 0 ? (
          <EmptyState title="Belum ada dokumen">
            Unggah katalog spek, FAQ garansi, atau profil toko. Tanpa dokumen, AI hanya bisa menjawab dari tabel produk.
          </EmptyState>
        ) : visibleDocs.length === 0 ? (
          <EmptyState title="Tidak ada dokumen yang cocok">Coba kata lain.</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13.5px]">
              <thead>
                <tr>
                  <th className={thClass}>Dokumen</th>
                  <th className={thClass}>Teks</th>
                  <th className={thClass}>Cuplikan</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDocs.map((doc) => {
                  const url = mediaUrl(doc.file_url)
                  return (
                    <tr key={doc.id} className={trClass}>
                      <td className={`${tdClass} max-w-[300px]`}>
                        <div className="font-semibold">{doc.title}</div>
                        <div className="mt-0.5 truncate font-mono text-[11.5px] text-muted">
                          {doc.filename}, {formatDate(doc.created_at)}
                        </div>
                      </td>
                      <td className={`${tdClass} w-[130px]`}>
                        {doc.has_text ? <Badge tone="outline">terbaca</Badge> : <Badge tone="danger">tanpa teks</Badge>}
                      </td>
                      <td className={`${tdClass} max-w-[440px] text-[12.5px] text-muted`}>
                        <span className="line-clamp-2">{doc.content_preview?.replace(/\s+/g, ' ') || '-'}</span>
                      </td>
                      <td className={`${tdClass} w-[1%] whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Buka PDF ${doc.title}`}
                              title="Buka PDF"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted transition-colors duration-200 hover:bg-[#121410]/[0.06] hover:text-text"
                            >
                              <Icon name="external" size={15} />
                            </a>
                          ) : null}
                          <ConfirmDelete
                            itemName={doc.title}
                            busy={deleteMutation.isPending && deleteMutation.variables === doc.id}
                            onConfirm={() => deleteMutation.mutate(doc.id)}
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
    </>
  )
}
