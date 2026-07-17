export type AuthUser = {
  id: string
  email: string
  name: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string
  user: AuthUser
}
