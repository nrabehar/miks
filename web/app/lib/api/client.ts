import axios from 'axios';

export const apiClient = axios.create({
	baseURL: '/api',
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json',
	},
	withCredentials: true,
});

apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('accessToken');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// If error is 401 and we haven't tried to refresh yet
		if (error.response?.status === 401 && !originalRequest._retry) {
			if (
				originalRequest.url?.includes('/auth/login') ||
				originalRequest.url?.includes('/auth/logout')
			) {
				// If login or logout itself failed, don't try to refresh
				return Promise.reject(error);
			}
			originalRequest._retry = true;

			try {
				// Try to refresh the token using the cookie-based refresh token
				// The refresh token is automatically sent via httpOnly cookie
				const response = await axios.post(
					`${apiClient.defaults.baseURL}/auth/refresh-token`,
					{}, // Empty body - refresh token comes from cookie
					{
						withCredentials: true, // Send cookies with request
						headers: {
							// Don't send expired access token for refresh
							Authorization: undefined,
						},
					},
				);

				const { accessToken, user } = response.data;
				localStorage.setItem('accessToken', accessToken);

				// Update user data if returned
				if (user) {
					localStorage.setItem('user', JSON.stringify(user));
				}

				// Retry original request with new token
				originalRequest.headers.Authorization = `Bearer ${accessToken}`;
				return apiClient(originalRequest);
			} catch (refreshError) {
				// Refresh failed, clear auth state
				localStorage.removeItem('accessToken');
				localStorage.removeItem('user');

				window.location.href = '/login';
				return Promise.reject(refreshError);
			}
		}

		return Promise.reject(error);
	},
);
