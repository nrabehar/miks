import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
	theme: Theme
	resolved: 'light' | 'dark'
	setTheme: (theme: Theme) => void
	toggle: () => void
}

const applyTheme = (resolved: 'light' | 'dark') => {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	root.classList.toggle('dark', resolved === 'dark')
}

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
	if (theme !== 'system') return theme
	if (typeof window === 'undefined') return 'light'
	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light'
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set, get) => ({
			theme: 'system',
			resolved: 'light',
			setTheme: (theme) => {
				const resolved = resolveTheme(theme)
				applyTheme(resolved)
				set({ theme, resolved })
			},
			toggle: () => {
				const current = get().resolved
				const next: Theme = current === 'dark' ? 'light' : 'dark'
				applyTheme(next)
				set({ theme: next, resolved: next })
			},
		}),
		{
			name: 'miks-theme',
			onRehydrateStorage: () => (state) => {
				if (!state) return
				const resolved = resolveTheme(state.theme)
				applyTheme(resolved)
				state.resolved = resolved
			},
		},
	),
)

// Initialize once at module load
if (typeof window !== 'undefined') {
	const mql = window.matchMedia('(prefers-color-scheme: dark)')
	mql.addEventListener('change', () => {
		const state = useThemeStore.getState()
		if (state.theme === 'system') {
			const resolved = resolveTheme('system')
			applyTheme(resolved)
			useThemeStore.setState({ resolved })
		}
	})
}
