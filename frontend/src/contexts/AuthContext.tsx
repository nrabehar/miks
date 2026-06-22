import { authApi } from '#/lib/api/auth.api'
import type { LoginRequest, RegisterRequest, User } from '#/types'
import { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
	user: User | null
	isLoading: boolean
	isAuthenticated: boolean
	login: (data: LoginRequest) => Promise<void>
	register: (data: RegisterRequest) => Promise<void>
	logout: () => Promise<void>
	refreshUser: () => Promise<void>
	removeAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
	children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const initAuth = async () => {
			const storedUser = localStorage.getItem('user')
			const accessToken = localStorage.getItem('accessToken')

			if (storedUser && accessToken) {
				try {
					setUser(JSON.parse(storedUser))
				} catch (err) {
					console.error('Failed to parse user from localStorage', err)
					localStorage.removeItem('user')
					localStorage.removeItem('accessToken')
				}
			}

			setIsLoading(false)
		}

		initAuth()
	}, [])

	const login = async (data: LoginRequest) => {
		const response = await authApi.login(data)
		setUser(response.user)
		localStorage.setItem('user', JSON.stringify(response.user))
		localStorage.setItem('accessToken', response.accessToken)
	}

	const register = async (data: RegisterRequest) => {
		await authApi.register(data)
	}

	const logout = async () => {
		setUser(null)
		localStorage.removeItem('user')
		localStorage.removeItem('accessToken')
	}

	const refreshUser = async () => {}

	const removeAuth = () => {
		setUser(null)
		localStorage.removeItem('user')
		localStorage.removeItem('accessToken')
	}

	const value = {
		user,
		isLoading,
		isAuthenticated: !!user,
		login,
		register,
		logout,
		refreshUser,
		removeAuth,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
	const context = useContext(AuthContext)

	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}

	return context
}
