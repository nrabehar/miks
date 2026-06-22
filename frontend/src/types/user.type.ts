export interface User {
	id: string
	email: string
	username: string
	displayName: string | null

	emailVerified: boolean

	enabled2FA: boolean
	twoFaSecret?: string | null

	isOnline: boolean
	lastActiveAt?: string | null
	lastLoginAt?: string | null
	createdAt: string
	updatedAt: string
	deletedAt?: string | null
}
