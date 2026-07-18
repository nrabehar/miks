import { apiClient } from "#/lib/api/client"
import type {
	ForgotPasswordInput,
	LoginInput,
	RegisterInput,
	ResetPasswordInput,
	Session,
	User,
} from "./schema"
import {
	deviceConfirmationRequiredSchema,
	sessionsSchema,
	userSchema,
} from "./schema"

export type LoginResult =
	| { status: "ok"; user: User }
	| { status: "confirmation-required"; confirmationId: string }

export async function fetchMe(): Promise<User> {
	const { data } = await apiClient.get("/auth/me")
	return userSchema.parse(data)
}

export async function login(input: LoginInput): Promise<LoginResult> {
	const { data } = await apiClient.post("/auth/login", input)

	if (data.requiresDeviceConfirmation) {
		const confirmation = deviceConfirmationRequiredSchema.parse(data)
		return {
			status: "confirmation-required",
			confirmationId: confirmation.confirmationId,
		}
	}

	return { status: "ok", user: userSchema.parse(data.user) }
}

export async function confirmDevice(
	confirmationId: string,
	code: string,
): Promise<User> {
	const { data } = await apiClient.post("/auth/device/confirm", {
		confirmationId,
		code,
	})
	return userSchema.parse(data.user)
}

export async function resendDeviceConfirmation(
	confirmationId: string,
): Promise<void> {
	await apiClient.post("/auth/device/resend-confirmation", { confirmationId })
}

export async function logout(): Promise<void> {
	await apiClient.post("/auth/logout")
}

export async function register(input: RegisterInput): Promise<User> {
	const { data } = await apiClient.post("/auth/register", {
		email: input.email,
		password: input.password,
		displayName: input.displayName,
	})
	return userSchema.parse(data.user)
}

export async function verifyEmail(token: string): Promise<void> {
	await apiClient.post("/auth/verify", { token })
}

export async function resendVerification(identifier: string): Promise<void> {
	await apiClient.post("/auth/resend-verification", { identifier })
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
	await apiClient.post("/auth/forgot-password", input)
}

export async function resetPassword(
	token: string,
	input: ResetPasswordInput,
): Promise<void> {
	await apiClient.post("/auth/reset-password", {
		token,
		password: input.password,
	})
}

export async function fetchSessions(): Promise<Session[]> {
	const { data } = await apiClient.get("/auth/sessions")
	return sessionsSchema.parse(data)
}

export async function revokeSession(sessionId: string): Promise<void> {
	await apiClient.delete(`/auth/sessions/${sessionId}`)
}
