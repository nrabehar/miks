import { queryOptions } from "@tanstack/react-query"
import type { ListParams } from "./api"
import {
	fetchGroup,
	fetchGroups,
	fetchInvites,
	fetchMembers,
	fetchRemovalVotes,
} from "./api"

export const groupKeys = {
	all: ["groups"] as const,
	lists: () => [...groupKeys.all, "list"] as const,
	list: (params: ListParams) => [...groupKeys.lists(), params] as const,
	detail: (groupId: string) => [...groupKeys.all, "detail", groupId] as const,
	members: (groupId: string, params: ListParams) =>
		[...groupKeys.all, "members", groupId, params] as const,
	invites: (groupId: string, params: ListParams) =>
		[...groupKeys.all, "invites", groupId, params] as const,
	removalVotes: (groupId: string, params: ListParams) =>
		[...groupKeys.all, "removal-votes", groupId, params] as const,
}

export function groupsListQueryOptions(params: ListParams) {
	return queryOptions({
		queryKey: groupKeys.list(params),
		queryFn: () => fetchGroups(params),
	})
}

export function groupQueryOptions(groupId: string) {
	return queryOptions({
		queryKey: groupKeys.detail(groupId),
		queryFn: () => fetchGroup(groupId),
	})
}

export function membersQueryOptions(groupId: string, params: ListParams) {
	return queryOptions({
		queryKey: groupKeys.members(groupId, params),
		queryFn: () => fetchMembers(groupId, params),
	})
}

export function invitesQueryOptions(groupId: string, params: ListParams) {
	return queryOptions({
		queryKey: groupKeys.invites(groupId, params),
		queryFn: () => fetchInvites(groupId, params),
	})
}

export function removalVotesQueryOptions(groupId: string, params: ListParams) {
	return queryOptions({
		queryKey: groupKeys.removalVotes(groupId, params),
		queryFn: () => fetchRemovalVotes(groupId, params),
	})
}
