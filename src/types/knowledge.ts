export type KnowledgeDocument = {
  id: number
  title: string
  filename: string
  file_url: string
  content_preview: string | null
  has_text: boolean
  created_at: string
}

export type KnowledgeSearchHit = {
  document_id: number
  title: string
  filename: string
  snippet: string
  score: number
}

export type KnowledgeSearchResponse = {
  query: string
  hits: KnowledgeSearchHit[]
}
