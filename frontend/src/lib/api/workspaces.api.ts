import { apiClient } from './client'

export interface WorkspaceMember {
	id: string
	userId: string
	role: string
	totalShares: number
	activityScore: number
	createdAt: string
	user: {
		id: string
		email: string
		username: string | null
		firstName: string | null
		lastName: string | null
		avatarUrl: string | null
	}
}

export interface Workspace {
	id: string
	name: string
	slug: string
	currency: string
	createdAt: string
	updatedAt: string
	workspaceMembers: WorkspaceMember[]
}

export interface CreateWorkspacePayload {
	name: string
}

export interface CotisationEntry {
	memberId: string
	amount: number
	month: number
	year: number
	note?: string
}

export interface Cotisation {
	id: string
	workspaceId: string
	memberId: string
	amount: string
	currency: string
	month: number
	year: number
	validatedAt: string | null
	note: string | null
	createdAt: string
	member: WorkspaceMember
}

export interface EquityItem {
	memberId: string
	userId: string
	displayName: string
	totalAmount: number
	sharePercent: number
	rank: number
}

export interface WorkspaceSummary {
	totalCaisse: number
	c1Balance: number
	c2Balance: number
	c3Balance: number
	memberCount: number
	cotisationRateThisMonth: number
	lastCotisationDate: string | null
	currency: string
}

export const workspacesApi = {
	list: () => apiClient.get<Workspace[]>('/workspaces').then((r) => r.data),

	create: (data: CreateWorkspacePayload) =>
		apiClient.post<Workspace>('/workspaces', data).then((r) => r.data),

	get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`).then((r) => r.data),

	delete: (id: string) => apiClient.delete(`/workspaces/${id}`),

	invite: (id: string, email: string, role?: string) =>
		apiClient.post(`/workspaces/${id}/members`, { email, role }).then((r) => r.data),

	removeMember: (workspaceId: string, userId: string) =>
		apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`),

	updateMemberRole: (workspaceId: string, userId: string, role: string) =>
		apiClient.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role }).then((r) => r.data),

	// ─── Cotisations & Finance ────────────────────────────────────────────────

	getCotisations: (workspaceId: string, params?: { month?: number; year?: number }) =>
		apiClient
			.get<Cotisation[]>(`/workspaces/${workspaceId}/cotisations`, { params })
			.then((r) => r.data),

	recordBatch: (workspaceId: string, entries: CotisationEntry[]) =>
		apiClient
			.post<Cotisation[]>(`/workspaces/${workspaceId}/cotisations/batch`, { entries })
			.then((r) => r.data),

	getEquity: (workspaceId: string) =>
		apiClient.get<EquityItem[]>(`/workspaces/${workspaceId}/cotisations/equity`).then((r) => r.data),

	getSummary: (workspaceId: string) =>
		apiClient
			.get<WorkspaceSummary>(`/workspaces/${workspaceId}/cotisations/summary`)
			.then((r) => r.data),

	// ─── 2FA helpers ──────────────────────────────────────────────────────────
	setup2FA: () => apiClient.post<{ otpauthUrl: string; secret: string }>('/auth/2fa/setup', {}).then((r) => r.data),
	enable2FA: (code: string) => apiClient.post('/auth/2fa/enable', { code }).then((r) => r.data),
	disable2FA: (code: string) => apiClient.post('/auth/2fa/disable', { code }).then((r) => r.data),
}
