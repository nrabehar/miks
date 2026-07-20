import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	acceptInvite,
	closeGroup,
	createGroup,
	createInvite,
	leaveGroup,
	revokeInvite,
	updateGroup,
} from "./api"
import type { ListParams } from "./api"
import {
	groupKeys,
	groupQueryOptions,
	groupsListQueryOptions,
	invitesQueryOptions,
	membersQueryOptions,
} from "./queries"

export function useGroups(params: ListParams) {
	return useQuery(groupsListQueryOptions(params))
}

export function useGroup(groupId: string) {
	return useQuery(groupQueryOptions(groupId))
}

export function useMembers(groupId: string, params: ListParams) {
	return useQuery(membersQueryOptions(groupId, params))
}

export function useInvites(groupId: string, params: ListParams) {
	return useQuery(invitesQueryOptions(groupId, params))
}

// Every group mutation opts out of TanStack Query's default online mutation
// pause/replay-on-reconnect individually (networkMode: "always"), rather than
// a global default: a group mutation must fail loudly offline, never queue
// (spec 0003-group-membership-ui AC-13).
export function useCreateGroup() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: createGroup,
		networkMode: "always",
		onSuccess: (group) => {
			queryClient.setQueryData(groupKeys.detail(group.id), group)
			void queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
		},
	})
}

export function useUpdateGroup(groupId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: Parameters<typeof updateGroup>[1]) =>
			updateGroup(groupId, input),
		networkMode: "always",
		onSuccess: (group) => {
			queryClient.setQueryData(groupKeys.detail(groupId), group)
			void queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
		},
	})
}

export function useLeaveGroup(groupId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => leaveGroup(groupId),
		networkMode: "always",
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
		},
	})
}

export function useCloseGroup(groupId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => closeGroup(groupId),
		networkMode: "always",
		onSuccess: (group) => {
			queryClient.setQueryData(groupKeys.detail(groupId), group)
			void queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
		},
	})
}

export function useCreateInvite(groupId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (email: string) => createInvite(groupId, email),
		networkMode: "always",
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: groupKeys.all,
				predicate: (query) =>
					query.queryKey[1] === "invites" && query.queryKey[2] === groupId,
			})
		},
	})
}

export function useRevokeInvite(groupId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (inviteId: string) => revokeInvite(groupId, inviteId),
		networkMode: "always",
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: groupKeys.all,
				predicate: (query) =>
					query.queryKey[1] === "invites" && query.queryKey[2] === groupId,
			})
		},
	})
}

export function useAcceptInvite() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: acceptInvite,
		networkMode: "always",
		onSuccess: (member) => {
			void queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
			void queryClient.invalidateQueries({
				queryKey: groupKeys.detail(member.groupId),
			})
		},
	})
}
