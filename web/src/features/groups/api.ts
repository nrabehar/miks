import { apiClient } from "#/lib/api/client"
import type {
	CreateGroupInput,
	Group,
	GroupInvite,
	GroupMember,
	InvitePreview,
	ProposeRemovalVoteInput,
	RemovalVote,
	UpdateGroupInput,
	VoteChoice,
} from "./schema"
import {
	groupInviteSchema,
	groupMemberSchema,
	groupSchema,
	groupsPageSchema,
	invitePreviewSchema,
	invitesPageSchema,
	membersPageSchema,
	removalVoteSchema,
	removalVotesPageSchema,
} from "./schema"

export interface ListParams {
	page: number
	limit: number
}

export async function fetchGroups(params: ListParams) {
	const { data } = await apiClient.get("/groups", { params })
	return groupsPageSchema.parse(data)
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
	const { data } = await apiClient.post("/groups", input)
	return groupSchema.parse(data)
}

export async function fetchGroup(groupId: string): Promise<Group> {
	const { data } = await apiClient.get(`/groups/${groupId}`)
	return groupSchema.parse(data)
}

export async function updateGroup(
	groupId: string,
	input: UpdateGroupInput,
): Promise<Group> {
	const { data } = await apiClient.patch(`/groups/${groupId}`, input)
	return groupSchema.parse(data)
}

export async function fetchMembers(groupId: string, params: ListParams) {
	const { data } = await apiClient.get(`/groups/${groupId}/members`, { params })
	return membersPageSchema.parse(data)
}

export async function leaveGroup(groupId: string): Promise<void> {
	await apiClient.post(`/groups/${groupId}/leave`)
}

export async function closeGroup(groupId: string): Promise<Group> {
	const { data } = await apiClient.post(`/groups/${groupId}/close`)
	return groupSchema.parse(data)
}

export async function fetchInvites(groupId: string, params: ListParams) {
	const { data } = await apiClient.get(`/groups/${groupId}/invites`, { params })
	return invitesPageSchema.parse(data)
}

export async function createInvite(
	groupId: string,
	email: string,
): Promise<GroupInvite> {
	const { data } = await apiClient.post(`/groups/${groupId}/invites`, { email })
	return groupInviteSchema.parse(data)
}

export async function revokeInvite(
	groupId: string,
	inviteId: string,
): Promise<void> {
	await apiClient.delete(`/groups/${groupId}/invites/${inviteId}`)
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
	const { data } = await apiClient.get(`/invites/${token}`)
	return invitePreviewSchema.parse(data)
}

export async function acceptInvite(token: string): Promise<GroupMember> {
	const { data } = await apiClient.post(`/invites/${token}/accept`)
	return groupMemberSchema.parse(data)
}

export async function fetchRemovalVotes(groupId: string, params: ListParams) {
	const { data } = await apiClient.get(`/groups/${groupId}/removal-votes`, { params })
	return removalVotesPageSchema.parse(data)
}

export async function proposeRemovalVote(
	groupId: string,
	memberId: string,
	input: ProposeRemovalVoteInput,
): Promise<RemovalVote> {
	const { data } = await apiClient.post(
		`/groups/${groupId}/members/${memberId}/removal-votes`,
		input,
	)
	return removalVoteSchema.parse(data)
}

export async function respondToVote(voteId: string, choice: VoteChoice): Promise<void> {
	await apiClient.post(`/votes/${voteId}/responses`, { choice })
}
