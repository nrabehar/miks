import type { LoginResponse, MessageResponse } from '#/types'
import type { LoginFormData, RegisterFormData } from '../validation/auth.schema'
import { apiClient } from './client'

export const authApi = {
	/**
	 * Register a new user
	 * @param data - username, email and password
	 */
	async register(data: RegisterFormData) {
		await apiClient.post('/auth/register', data)
	},

	/**
	 * Login a user
	 * @param data - identifier and password
	 * @returns
	 */
	async login(data: LoginFormData) {
		const response = await apiClient.post<LoginResponse>(
			'/auth/login',
			data,
		)
		return response.data
	},

	async confirmEmail(code: string) {
		const response = await apiClient.post<MessageResponse>(
			'auth/email/confirm',
			{ code },
		)
		return response.data
	},
}
