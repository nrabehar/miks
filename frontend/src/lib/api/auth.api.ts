import type { AuthUser } from '#/stores/auth.store'
import { apiClient } from './client'

export interface RegisterPayload {
	firstName: string
	lastName: string
	email: string
	password: string
}

export interface RegisterResponse {
	registrationId: string
	emailSent: boolean
}

export interface LoginPayload {
	identifier: string
	password: string
}

export type LoginResponse =
	| { requires2FA: true; challengeId: string }
	| { requires2FA: false; accessToken: string; user: AuthUser }

export interface TwoFactorSetupResponse {
	otpauthUrl: string
	secret: string
	recoveryCodes: string[]
}

export const authApi = {
	register: (data: RegisterPayload) =>
		apiClient.post<RegisterResponse>('/auth/register', data).then((r) => r.data),

	verifyEmail: (data: { registrationId: string; code: string }) =>
		apiClient.post<{ ok: true }>('/auth/verify-email', data).then((r) => r.data),

	resendEmailCode: (registrationId: string) =>
		apiClient.post<void>('/auth/resend-email', { registrationId }).then((r) => r.data),

	login: (data: LoginPayload) =>
		apiClient.post<LoginResponse>('/auth/login', data).then((r) => r.data),

	verify2FALogin: (data: { challengeId: string; code: string }) =>
		apiClient.post<{ accessToken: string; user: AuthUser }>('/auth/2fa/verify', data).then((r) => r.data),

	forgotPassword: (email: string) =>
		apiClient.post<void>('/auth/forgot-password', { email }).then((r) => r.data),

	resetPassword: (data: { userId: string; code: string; newPassword: string }) =>
		apiClient.post<void>('/auth/reset-password', data).then((r) => r.data),

	me: () => apiClient.get<AuthUser>('/auth/me').then((r) => r.data),
	logout: () => apiClient.post<void>('/auth/logout').then((r) => r.data),
}
