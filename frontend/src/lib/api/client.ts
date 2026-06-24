import { useAuthStore } from '#/stores/auth.store'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/**
 * Resolve the API base URL at build time.
 *
 * Priority:
 *  1. VITE_API_URL — full absolute URL of the backend (dev / cross-origin prod)
 *  2. '' (empty)   — same-origin requests, expected to be proxied by the
 *                    reverse proxy (nginx) under the /api prefix
 *  3. fallback to localhost:3000 if neither is set (dev convenience)
 */
const rawBaseURL = (import.meta.env.VITE_API_URL ?? '').trim()

export const apiClient = axios.create({
	baseURL: rawBaseURL || '',
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
	withCredentials: true,
})

// When running behind the production reverse-proxy, prefix every request
// path with /api so nginx forwards it to the backend. In dev (absolute
// VITE_API_URL) we leave paths untouched so the user can keep calling
// /auth/login directly.
const useApiPrefix = rawBaseURL === ''

apiClient.interceptors.request.use((config) => {
	if (useApiPrefix && config.url && !config.url.startsWith('/api/')) {
		config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`
	}
	return config
})

apiClient.interceptors.request.use(
	(config) => {
		const token = useAuthStore.getState().accessToken
		if (token) config.headers.Authorization = `Bearer ${token}`
		return config
	},
	(error) => {
		return Promise.reject(error)
	},
)

let refreshPromise: Promise<string | null> | null = null

const performRefresh = async (): Promise<string | null> => {
	try {
		const { data } = await apiClient.post<{ accessToken: string }>(
			'/auth/refresh',
			{},
		)
		const state = useAuthStore.getState()
		if (state.user) {
			state.setSession({ accessToken: data.accessToken, user: state.user })
		}
		return data.accessToken as string
	} catch {
		useAuthStore.getState().clearSession()
		return null
	}
}

apiClient.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const original = error.config as
			| (InternalAxiosRequestConfig & { _retry?: boolean })
			| undefined

		if (
			error.response?.status === 401 &&
			original &&
			!original._retry &&
			!original.url?.includes('/auth/')
		) {
			original._retry = true
			refreshPromise ||= performRefresh().finally(() => {
				refreshPromise = null
			})
			const newToken = await refreshPromise
			if (newToken) {
				original.headers.Authorization = `Bearer ${newToken}`
				return apiClient(original)
			}
		}
		return Promise.reject(error)
	},
)
