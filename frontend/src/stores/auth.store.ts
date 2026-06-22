import { authApi } from '#/lib/api'
import type { LoginFormData, RegisterFormData } from '#/lib/validation/auth.schema'
import type { User } from '#/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthStore = {
	user: User | null
	isLoading: boolean
	isAuthenticated: boolean
	login: (data: LoginFormData) => Promise<void>
	register: (data: RegisterFormData) => Promise<void>
	logout: () => Promise<void>
	refreshUser: () => Promise<void>
	removeAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
	persist(
		(set) => ({
			user: null,
			isLoading: true,
			isAuthenticated: false,
			login: async (data: LoginFormData) => {
				const response = await authApi.login(data)
				set({
					user: response.user,
					isLoading: false,
					isAuthenticated: true,
				})
			},
			register: async (data: RegisterFormData) => {
				await authApi.register(data)
			},
			logout: async () => {
				// await authApi.logout()
				set({ user: null, isLoading: false, isAuthenticated: false })
			},
			refreshUser: async () => {
				// const response = await authApi.refreshUser()
				// set({ user: response.user, isLoading: false })
			},
			removeAuth: () => {
				set({ user: null, isLoading: false, isAuthenticated: false })
			},
		}),
		{ name: 'auth-storage' },
	),
)
