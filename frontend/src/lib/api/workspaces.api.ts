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
	createdAt: string
	updatedAt: string
	workspaceMembers: WorkspaceMember[]
}

export interface CreateWorkspacePayload {
	name: string
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

	setup2FA: () => apiClient.post<{ otpauthUrl: string; secret: string }>('/auth/2fa/setup', {}).then((r) => r.data),
	enable2FA: (code: string) => apiClient.post('/auth/2fa/enable', { code }).then((r) => r.data),
	disable2FA: (code: string) => apiClient.post('/auth/2fa/disable', { code }).then((r) => r.data),
}
