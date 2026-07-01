import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
	id: string
	email: string
	firstName: string
	lastName: string | null
	phone: string | null
	avatarUrl: string | null
	emailVerified: boolean
	phoneVerified: boolean
	twoFaEnabled: boolean
	language: string
	isOnline?: boolean
}

export type AuthStatus = 'anonymous' | 'authenticated' | 'refreshing'

type AuthStore = {
	user: AuthUser | null
	status: AuthStatus
	accessToken: string | null
	setSession: (s: { user: AuthUser; accessToken: string }) => void
	setUser: (u: AuthUser) => void
	setRefreshing: () => void
	clearSession: () => void
}

/**
 * Selector helper — derives the *effective* status:
 * `authenticated` requires both a user AND an accessToken.
 * Otherwise the store is considered anonymous regardless of what `status` says.
 */
export function isAuthenticated(state: Pick<AuthStore, 'user' | 'accessToken'>): boolean {
	return Boolean(state.user && state.accessToken)
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
			setRefreshing: () => set({ status: 'refreshing' }),
			clearSession: () =>
				set({ user: null, accessToken: null, status: 'anonymous' }),
		}),
		{
			name: 'miks-auth',
			// Persist only the user (the accessToken lives in memory only — never in
			// localStorage, to limit XSS impact). `status` is recomputed on mount
			// from the effective selector (user + accessToken), so we don't persist it.
			partialize: (s) => ({ user: s.user }),
			// After hydration from localStorage, force the effective status:
			// if there's no accessToken (which is always the case after a page reload
			// since we never persist it), we cannot be "authenticated" — clear any
			// stale "authenticated" status that may have been written by a bug.
			onRehydrateStorage: () => (state) => {
				if (state && !state.accessToken) {
					state.status = 'anonymous'
				}
			},
		},
	),
)
