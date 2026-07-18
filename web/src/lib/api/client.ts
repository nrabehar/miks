import { env } from "#/lib/config/env"
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

export const apiClient = axios.create({
	baseURL: env.VITE_API_PATH ?? env.VITE_API_URL,
	withCredentials: true,
	headers: {
		"X-Requested-With": "XMLHttpRequest",
	},
})

// Every successful API response is wrapped by the API's global
// TransformInterceptor (api/src/common/interceptors/transform.interceptor.ts):
// { success, statusCode, data, path, timestamp }. Unwrap it once here so every
// feature's api.ts can treat response.data as the real payload.
interface ResponseEnvelope<T> {
	success: true
	statusCode: number
	data: T
	path: string
	timestamp: string
}

function isEnvelope(body: unknown): body is ResponseEnvelope<unknown> {
	return (
		typeof body === "object" &&
		body !== null &&
		"success" in body &&
		"data" in body &&
		(body as { success: unknown }).success === true
	)
}

apiClient.interceptors.response.use((response) => {
	if (isEnvelope(response.data)) {
		response.data = response.data.data
	}
	return response
})

// Every /auth/me call the app makes goes through this same client, so a shared
// listener set lets the router's root loader react to a forced logout (refresh
// failed) without importing the router here and creating a cycle.
type SessionExpiredListener = () => void
const sessionExpiredListeners = new Set<SessionExpiredListener>()

export function onSessionExpired(listener: SessionExpiredListener) {
	sessionExpiredListeners.add(listener)
	return () => {
		sessionExpiredListeners.delete(listener)
	}
}

function notifySessionExpired() {
	for (const listener of sessionExpiredListeners) listener()
}

interface RetryableConfig extends InternalAxiosRequestConfig {
	_retried?: boolean
}

// Single flight refresh: several requests can 401 at nearly the same moment.
// Only the first triggers /auth/refresh; the rest await that one promise and
// retry with it. Without this, a second refresh call would replay an
// already rotated token, which the API treats as reuse and revokes the
// whole session (spec 0001-authentication, AC-6).
let refreshPromise: Promise<void> | null = null

async function refreshSession(): Promise<void> {
	if (!refreshPromise) {
		refreshPromise = apiClient
			.post("/auth/refresh")
			.then(() => undefined)
			.finally(() => {
				refreshPromise = null
			})
	}
	return refreshPromise
}

apiClient.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const config = error.config as RetryableConfig | undefined
		const status = error.response?.status
		const isAuthRoute = config?.url?.startsWith("/auth/")

		if (status !== 401 || !config || config._retried || isAuthRoute) {
			throw error
		}

		config._retried = true

		try {
			await refreshSession()
			return apiClient.request(config)
		} catch (refreshError) {
			notifySessionExpired()
			throw refreshError
		}
	},
)
