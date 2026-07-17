export type Product = {
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
  created_at: string
  updated_at: string
}

export type ProductInput = {
  name: string
  brand: string
  category: string
  target_users: string
  price: number
  processor: string
  ram: string
  storage: string
  gpu: string
}

export type Customer = {
  id: number
  name: string
  whatsapp: string | null
  email: string | null
  city: string | null
  created_at: string
  conversation_count: number
}

export type CustomerInput = {
  name: string
  whatsapp?: string
  email?: string
  city?: string
}

export type DashboardStats = {
  products: number
  customers: number
  leads: number
  conversations: number
}
