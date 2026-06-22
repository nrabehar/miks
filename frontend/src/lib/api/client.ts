import axios from 'axios'

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
	},
	timeout: 10000,
	withCredentials: true,
})

apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('accessToken')
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	(error) => {
		return Promise.reject(error)
	},
)

apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config

		if (error.response?.status === 401 && !originalRequest._retry) {
			if (
				originalRequest.url?.includes('/auth/login') ||
				originalRequest.url?.includes('/auth/logout')
			) {
				return Promise.reject(error)
			}
			originalRequest._retry = true

			try {
				const response = await axios.post(
					`${apiClient.defaults.baseURL}/auth/refresh`,
					{},
					{
						withCredentials: true,
						headers: { Authorization: undefined },
					},
				)

				const { accessToken } = response.data
				localStorage.setItem('accessToken', accessToken)

				originalRequest.headers.Authorization = `Bearer ${accessToken}`
				return apiClient(originalRequest)
			} catch (refreshError) {
				localStorage.removeItem('accessToken')
				localStorage.removeItem('user')
				window.location.href = '/auth/login'
				return Promise.reject(refreshError)
			}
		}

		return Promise.reject(error)
	},
)
