import { apiClient } from "#/lib/api/client"
import type { LoginInput, User } from "./schema"
import { userSchema } from "./schema"

export async function fetchMe(): Promise<User> {
	const { data } = await apiClient.get("/auth/me")
	return userSchema.parse(data)
}

export async function login(input: LoginInput): Promise<User> {
	const { data } = await apiClient.post("/auth/login", input)
	return userSchema.parse(data.user)
}

export async function logout(): Promise<void> {
	await apiClient.post("/auth/logout")
}
