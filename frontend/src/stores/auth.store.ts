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
	setSession: (s: { user: AuthUser; accessToken: string }) => void
	setUser: (u: AuthUser) => void
	clearSession: () => void
}

export const useAuthStore = create<AuthStore>()(
	persist(
		(set) => ({
			accessToken: null,
			user: null,
			status: 'anonymous',
			setSession: ({ user, accessToken }) =>
				set({ user, accessToken, status: 'authenticated' }),
			setUser: (user) => set({ user }),
			clearSession: () =>
				set({ user: null, accessToken: null, status: 'anonymous' }),
		}),
		{
			name: 'miks-auth',
			// accessToken stays in memory only — never persisted to localStorage (XSS mitigation)
			partialize: (s) => ({ user: s.user, status: s.status }),
		},
	),
)
