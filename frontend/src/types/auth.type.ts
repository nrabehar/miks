import type { User } from "./user.type"

export interface RegisterRequest {
	username: string
	email: string
	password: string
}

export interface LoginRequest {
	identifier: string
	password: string
	rememberMe?: boolean
}

export interface ResendVerificationEmailRequest {
	email: string
}

export interface LoginResponse {
	accessToken: string
	user: User | null
}