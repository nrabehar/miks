import { ThemeProvider } from '#/components/provider/theme.provider'
import { Toaster } from '#/components/ui/sonner'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRoute, useMatches } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import '../styles.css'

export const Route = createRootRoute({
	component: RootComponent,
})

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			staleTime: 5 * 60 * 1000,
		},
	},
})

/**
 * Update document.title based on the deepest matching route's meta.title.
 * Routes opt in by exporting `staticData: { title: '...' }` (handled below)
 * or by using the `useDocumentTitle` hook.
 */
function useDocumentTitle() {
	const matches = useMatches()
	useEffect(() => {
		const deepest = matches[matches.length - 1]
		const title = (deepest?.staticData as { title?: string } | undefined)?.title
		document.title = title ? `${title} · Miks` : 'Miks'
	}, [matches])
}

function RootComponent() {
	useDocumentTitle()
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<MotionConfig
					reducedMotion="user"
					transition={{ duration: 0.4 }}
				>
					<ThemeProvider>
						<Outlet />
						<Toaster position="top-right" richColors closeButton />
					</ThemeProvider>
					<TanStackDevtools
						config={{
							position: 'bottom-right',
						}}
						plugins={[
							{
								name: 'TanStack Router',
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				</MotionConfig>
			</QueryClientProvider>
		</>
	)
}
