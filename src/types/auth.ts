export type AuthUser = {
  id: string
  email: string
  name: string
  role: 'admin' | 'sales' | string
  whatsapp?: string | null
  accepts_leads?: boolean
  is_active?: boolean
}

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string
  user: AuthUser
}
