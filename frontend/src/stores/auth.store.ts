import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
	id: string
	email: string
	phone?: string
	displayName?: string
	emailVerified: boolean
	phoneVerified: boolean
	twoFaEnabled: boolean
}

export type AuthStatus = 'anonymous' | 'authenticated'

type AuthStore = {
	user: AuthUser | null
	status: AuthStatus
	accessToken: string | null
	refreshToken: string | null
	setSession: (s: {
		user: AuthUser
		accessToken: string
		refreshToken: string
	}) => void
	setUser: (u: AuthUser) => void
	clearSession: () => void
}

export const useAuthStore = create<AuthStore>()(
	persist(
		(set) => ({
			accessToken: null,
			refreshToken: null,
			user: null,
			status: 'anonymous',
			setSession: ({ user, accessToken, refreshToken }) =>
				set({
					user,
					accessToken,
					refreshToken,
					status: 'authenticated',
				}),
			setUser: (user) => set({ user }),
			clearSession: () =>
				set({
					user: null,
					accessToken: null,
					refreshToken: null,
					status: 'anonymous',
				}),
		}),
		{
			name: 'miks-auth',
			partialize: (s) => ({
				accessToken: s.accessToken,
				refreshToken: s.refreshToken,
				user: s.user,
				status: s.status,
			}),
		},
	),
)
