export type Quotation = {
  id: number
  customer_id: number
  customer_name: string
  product_id: number
  product_name: string
  qty: number
  price: number
  grand_total: number
  price_label: string
  grand_total_label: string
  file_path: string | null
  file_url: string | null
  created_at: string
}

export type QuotationInput = {
  customer_id: number
  product_id: number
  qty: number
}
