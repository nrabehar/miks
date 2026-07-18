import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	confirmDevice,
	forgotPassword,
	login,
	logout,
	register,
	resendDeviceConfirmation,
	resendVerification,
	resetPassword,
	revokeSession,
	verifyEmail,
} from "./api"
import { authKeys, meQueryOptions, sessionsQueryOptions } from "./queries"

export function useMe() {
	return useQuery(meQueryOptions)
}

export function useRegister() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: register,
		onSuccess: (user) => {
			queryClient.setQueryData(authKeys.me(), user)
		},
	})
}

export function useVerifyEmail() {
	return useMutation({ mutationFn: verifyEmail })
}

export function useResendVerification() {
	return useMutation({ mutationFn: resendVerification })
}

export function useForgotPassword() {
	return useMutation({ mutationFn: forgotPassword })
}

export function useResetPassword() {
	return useMutation({
		mutationFn: ({ token, password }: { token: string; password: string }) =>
			resetPassword(token, { password, confirmPassword: password }),
	})
}

export function useSessions() {
	return useQuery(sessionsQueryOptions)
}

export function useRevokeSession() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: revokeSession,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: authKeys.sessions() })
		},
	})
}

export function useLogin() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: login,
		onSuccess: (result) => {
			if (result.status === "ok") {
				queryClient.setQueryData(authKeys.me(), result.user)
			}
		},
	})
}

export function useConfirmDevice() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			confirmationId,
			code,
		}: {
			confirmationId: string
			code: string
		}) => confirmDevice(confirmationId, code),
		onSuccess: (user) => {
			queryClient.setQueryData(authKeys.me(), user)
		},
	})
}

export function useResendDeviceConfirmation() {
	return useMutation({ mutationFn: resendDeviceConfirmation })
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
