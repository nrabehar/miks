import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { login, logout } from "./api"
import { authKeys, meQueryOptions } from "./queries"

export function useMe() {
	return useQuery(meQueryOptions)
}

export function useLogin() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: login,
		onSuccess: (user) => {
			queryClient.setQueryData(authKeys.me(), user)
		},
	})
}

export function useLogout() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: logout,
		onSuccess: () => {
			queryClient.setQueryData(authKeys.me(), null)
			queryClient.clear()
		},
	})
}
