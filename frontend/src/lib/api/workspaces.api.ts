import { apiClient } from './client'

// ─── Auth/Workspace base types ────────────────────────────────────────────────

export interface WorkspaceMember {
	id: string
	userId: string
	role: string
	totalShares: number
	sharePercent: number
	activityScore: number
	joinedAt: string
	user: {
		id: string
		email: string
		username: string | null
		firstName: string | null
		lastName: string | null
		avatarUrl: string | null
	}
	withdrawableVault?: { balance: string; currency: string }
}

export interface Workspace {
	id: string
	name: string
	slug: string
	currency: string
	description?: string
	createdAt: string
	updatedAt: string
	workspaceMembers: WorkspaceMember[]
}

export interface CreateWorkspacePayload {
	name: string
}

// ─── Cotisations ──────────────────────────────────────────────────────────────

export interface CotisationEntry {
	memberId: string
	amount: number
	period?: string
	note?: string
}

export interface Cotisation {
	id: string
	workspaceId: string
	memberId: string
	amount: string
	currency: string
	period: string | null
	note: string | null
	createdAt: string
	member: WorkspaceMember
}

export interface EquityItem {
	memberId: string
	userId: string
	firstName: string | null
	lastName: string | null
	avatarUrl: string | null
	displayName: string
	totalShares: number
	sharePercent: number
	withdrawableBalance: number
	currency: string
	rank: number
}

export interface WorkspaceSummary {
	vaults: { id: string; name: string; balance: number; currency: string }[]
	totalGroupBalance: number
	memberCount: number
	lastCotisation: { period: string | null; createdAt: string } | null
	// legacy fields kept for existing UI
	totalCaisse?: number
	c1Balance?: number
	c2Balance?: number
	cotisationRateThisMonth?: number
	currency?: string
}

// ─── Vaults ───────────────────────────────────────────────────────────────────

export interface Vault {
	id: string
	workspaceId: string
	name: string
	description: string | null
	balance: string
	currency: string
	isArchived: boolean
	createdAt: string
	updatedAt: string
}

export interface CreateVaultPayload {
	name: string
	description?: string
	currency?: string
}

export interface LedgerEntry {
	id: string
	workspaceId: string
	vaultId: string | null
	vaultType: string
	type: 'IN' | 'OUT'
	category: string
	amount: string
	currency: string
	description: string | null
	referenceId: string | null
	referenceType: string | null
	authorId: string
	createdAt: string
}

// ─── Flux rules ───────────────────────────────────────────────────────────────

export interface FluxRuleDestination {
	id: string
	fluxRuleId: string
	targetType: 'GROUP_VAULT' | 'WITHDRAWABLE_VAULTS'
	targetVaultId: string | null
	percent: string
	percentParam: string | null
	targetVault?: { id: string; name: string } | null
}

export interface FluxRule {
	id: string
	workspaceId: string
	name: string
	sourceType: string
	sourceId: string | null
	isActive: boolean
	description: string | null
	createdAt: string
	updatedAt: string
	destinations: FluxRuleDestination[]
}

export interface CreateFluxRulePayload {
	name: string
	sourceType: 'COTISATION' | 'PROJECT_REVENUE' | 'MANUAL'
	sourceId?: string
	description?: string
	destinations: {
		targetType: 'GROUP_VAULT' | 'WITHDRAWABLE_VAULTS'
		targetVaultId?: string
		percent: number
	}[]
}

export interface UpdateFluxRulePayload {
	name?: string
	isActive?: boolean
	description?: string
	destinations?: CreateFluxRulePayload['destinations']
}

export interface ApplyFluxPayload {
	amount: number
	description?: string
	params?: Record<string, number>
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
	id: string
	workspaceId: string
	proposedById: string
	title: string
	description: string
	budget: string | null
	currency: string
	status: 'PENDING_VOTE' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
	sourceVaultId: string | null
	createdAt: string
	updatedAt: string
	proposedBy?: {
		id: string
		user: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null }
	}
	vote?: {
		id: string
		status: string
		result: string | null
		yesCount: number
		noCount: number
		abstainCount: number
		closesAt: string
		threshold: number
	}
	sourceVault?: { id: string; name: string; balance: string } | null
}

export interface CreateProjectPayload {
	title: string
	description: string
	budget?: number
	currency?: string
	sourceVaultId?: string
	voteClosesAt: string
	voteThreshold: number
	voteQuorum?: number
}

// ─── Votes ────────────────────────────────────────────────────────────────────

export interface Vote {
	id: string
	workspaceId: string
	projectId: string
	threshold: number
	quorum: number | null
	status: 'OPEN' | 'CLOSED' | 'INVALIDATED'
	result: 'APPROVED' | 'REJECTED' | 'NO_QUORUM' | null
	yesCount: number
	noCount: number
	abstainCount: number
	opensAt: string
	closesAt: string
	closedAt: string | null
	project?: { id: string; title: string; status: string }
	choices?: VoteChoice[]
}

export interface VoteChoice {
	id: string
	voteId: string
	memberId: string
	choice: 'YES' | 'NO' | 'ABSTAIN'
	createdAt: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
	id: string
	userId: string
	workspaceId: string | null
	type: string
	title: string
	body: string
	channel: string
	referenceType: string | null
	referenceId: string | null
	isRead: boolean
	sentAt: string
	readAt: string | null
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
	id: string
	workspaceId: string | null
	userId: string | null
	memberId: string | null
	event: string
	metadata: Record<string, unknown> | null
	ipAddress: string | null
	createdAt: string
}

// ─── API object ───────────────────────────────────────────────────────────────

export const workspacesApi = {
	// ── Workspaces ──────────────────────────────────────────────────────────────
	list: () => apiClient.get<Workspace[]>('/workspaces').then((r) => r.data),
	create: (data: CreateWorkspacePayload) =>
		apiClient.post<Workspace>('/workspaces', data).then((r) => r.data),
	get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`).then((r) => r.data),
	delete: (id: string) => apiClient.delete(`/workspaces/${id}`),

	// ── Members ─────────────────────────────────────────────────────────────────
	invite: (id: string, email: string, role?: string) =>
		apiClient.post(`/workspaces/${id}/members/invite`, { email, role }).then((r) => r.data),
	removeMember: (workspaceId: string, userId: string) =>
		apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`),
	updateMemberRole: (workspaceId: string, userId: string, role: string) =>
		apiClient.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role }).then((r) => r.data),
	getMembers: (workspaceId: string) =>
		apiClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`).then((r) => r.data),

	// ── Cotisations & Finance ────────────────────────────────────────────────────
	getCotisations: (workspaceId: string, params?: { period?: string }) =>
		apiClient
			.get<Cotisation[]>(`/workspaces/${workspaceId}/cotisations`, { params })
			.then((r) => r.data),
	recordBatch: (workspaceId: string, entries: CotisationEntry[]) =>
		apiClient
			.post<{ recorded: number; cotisations: Cotisation[] }>(
				`/workspaces/${workspaceId}/cotisations/batch`,
				{ entries },
			)
			.then((r) => r.data),
	getEquity: (workspaceId: string) =>
		apiClient.get<EquityItem[]>(`/workspaces/${workspaceId}/cotisations/equity`).then((r) => r.data),
	getSummary: (workspaceId: string) =>
		apiClient
			.get<WorkspaceSummary>(`/workspaces/${workspaceId}/cotisations/summary`)
			.then((r) => r.data),

	// ── Vaults ──────────────────────────────────────────────────────────────────
	listVaults: (workspaceId: string) =>
		apiClient.get<Vault[]>(`/workspaces/${workspaceId}/vaults`).then((r) => r.data),
	createVault: (workspaceId: string, data: CreateVaultPayload) =>
		apiClient.post<Vault>(`/workspaces/${workspaceId}/vaults`, data).then((r) => r.data),
	archiveVault: (workspaceId: string, vaultId: string) =>
		apiClient.patch<Vault>(`/workspaces/${workspaceId}/vaults/${vaultId}/archive`).then((r) => r.data),
	getLedger: (workspaceId: string) =>
		apiClient.get<LedgerEntry[]>(`/workspaces/${workspaceId}/vaults/ledger`).then((r) => r.data),
	getVaultLedger: (workspaceId: string, vaultId: string) =>
		apiClient
			.get<LedgerEntry[]>(`/workspaces/${workspaceId}/vaults/${vaultId}/ledger`)
			.then((r) => r.data),
	exportLedgerCsv: (workspaceId: string, vaultId?: string) => {
		const params = vaultId ? `?vaultId=${vaultId}` : ''
		return `/workspaces/${workspaceId}/vaults/ledger/export${params}`
	},

	// ── Flux rules ──────────────────────────────────────────────────────────────
	listFluxRules: (workspaceId: string) =>
		apiClient.get<FluxRule[]>(`/workspaces/${workspaceId}/flux-rules`).then((r) => r.data),
	createFluxRule: (workspaceId: string, data: CreateFluxRulePayload) =>
		apiClient.post<FluxRule>(`/workspaces/${workspaceId}/flux-rules`, data).then((r) => r.data),
	updateFluxRule: (workspaceId: string, ruleId: string, data: UpdateFluxRulePayload) =>
		apiClient
			.patch<FluxRule>(`/workspaces/${workspaceId}/flux-rules/${ruleId}`, data)
			.then((r) => r.data),
	applyFluxRule: (workspaceId: string, ruleId: string, data: ApplyFluxPayload) =>
		apiClient
			.post(`/workspaces/${workspaceId}/flux-rules/${ruleId}/apply`, data)
			.then((r) => r.data),

	// ── Projects ────────────────────────────────────────────────────────────────
	listProjects: (workspaceId: string, status?: string) =>
		apiClient
			.get<Project[]>(`/workspaces/${workspaceId}/projects`, { params: status ? { status } : {} })
			.then((r) => r.data),
	createProject: (workspaceId: string, data: CreateProjectPayload) =>
		apiClient.post<Project>(`/workspaces/${workspaceId}/projects`, data).then((r) => r.data),
	getProject: (workspaceId: string, projectId: string) =>
		apiClient.get<Project>(`/workspaces/${workspaceId}/projects/${projectId}`).then((r) => r.data),

	// ── Votes ────────────────────────────────────────────────────────────────────
	listVotes: (workspaceId: string, status?: string) =>
		apiClient
			.get<Vote[]>(`/workspaces/${workspaceId}/votes`, { params: status ? { status } : {} })
			.then((r) => r.data),
	getVote: (workspaceId: string, voteId: string) =>
		apiClient.get<Vote>(`/workspaces/${workspaceId}/votes/${voteId}`).then((r) => r.data),
	castVote: (workspaceId: string, voteId: string, choice: 'YES' | 'NO' | 'ABSTAIN') =>
		apiClient
			.post(`/workspaces/${workspaceId}/votes/${voteId}/cast`, { choice })
			.then((r) => r.data),
	closeVote: (workspaceId: string, voteId: string) =>
		apiClient.post(`/workspaces/${workspaceId}/votes/${voteId}/close`).then((r) => r.data),
	getMyVote: (workspaceId: string, voteId: string) =>
		apiClient
			.get<VoteChoice | null>(`/workspaces/${workspaceId}/votes/${voteId}/my-vote`)
			.then((r) => r.data),

	// ── Notifications ───────────────────────────────────────────────────────────
	listNotifications: (unread?: boolean) =>
		apiClient
			.get<Notification[]>('/notifications', { params: unread ? { unread: 'true' } : {} })
			.then((r) => r.data),
	countUnread: () =>
		apiClient.get<{ count: number }>('/notifications/count').then((r) => r.data),
	markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
	markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

	// ── Audit ───────────────────────────────────────────────────────────────────
	listAudit: (workspaceId: string, opts?: { event?: string; limit?: number }) =>
		apiClient
			.get<AuditLog[]>(`/workspaces/${workspaceId}/audit`, {
				params: { ...(opts?.event ? { event: opts.event } : {}), ...(opts?.limit ? { limit: opts.limit } : {}) },
			})
			.then((r) => r.data),

	// ── 2FA helpers ─────────────────────────────────────────────────────────────
	setup2FA: () =>
		apiClient.post<{ otpauthUrl: string; secret: string }>('/auth/2fa/setup', {}).then((r) => r.data),
	enable2FA: (code: string) => apiClient.post('/auth/2fa/enable', { code }).then((r) => r.data),
	disable2FA: (code: string) => apiClient.post('/auth/2fa/disable', { code }).then((r) => r.data),
}
