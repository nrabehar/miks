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
	email: string
	password: string
}

export type LoginResponse =
	| { requires2FA: true; challengeId: string }
	| { requires2FA: false; accessToken: string; user: AuthUser }

export interface TwoFactorSetupResponse {
	otpAuthUrl: string
	secret: string
}

export interface UpdateProfilePayload {
	firstName?: string
	lastName?: string
	phone?: string
	language?: string
	avatarUrl?: string
}

export interface UpdateProfileResponse {
	id: string
	email: string
	firstName: string
	lastName: string | null
	avatarUrl: string | null
	phone: string | null
	language: string
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

	updateProfile: (data: UpdateProfilePayload) =>
		apiClient.patch<UpdateProfileResponse>('/auth/profile', data).then((r) => r.data),

	setup2FA: () =>
		apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup').then((r) => r.data),

	enable2FA: (code: string) =>
		apiClient.post<{ enabled: boolean }>('/auth/2fa/enable', { code }).then((r) => r.data),

	disable2FA: (code: string) =>
		apiClient.post<{ disabled: boolean }>('/auth/2fa/disable', { code }).then((r) => r.data),
}
