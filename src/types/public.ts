export type PublicProduct = {
  id: number
  name: string
  brand: string
  category: string
  target_users: string
  price: number
  processor: string
  ram: string
  storage: string
  gpu: string
  thumbnail: string | null
}

export type PublicStore = {
  name: string
  whatsapp: string | null
  sales_count: number
  address: string | null
  hours: string | null
  warranty: string | null
  payment: string | null
  shipping: string | null
}
