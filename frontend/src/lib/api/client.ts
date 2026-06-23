import { useAuthStore } from '#/stores/auth.store'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
	withCredentials: true,
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
	const refreshToken = useAuthStore.getState().refreshToken
	if (!refreshToken) return null

	try {
		const { data } = await axios.post(
			`${apiClient.defaults.baseURL}/auth/refresh`,
			{ refreshToken },
			{ headers: { 'Content-Type': 'application/json' } },
		)
		const state = useAuthStore.getState()
		if (state.user) {
			state.setSession({
				accessToken: data.accessToken,
				refreshToken: data.refreshToken ?? refreshToken,
				user: state.user,
			})
		}
		return data.accessToken as string
	} catch (error) {
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
