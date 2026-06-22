import { ThemeProvider } from '#/components/provider/theme.provider'
import { ClerkProvider } from '@clerk/react'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { MotionConfig } from 'framer-motion'
import '../styles.css'

export const Route = createRootRoute({
	component: RootComponent,
})

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			staleTime: 5 * 60 * 1000, // 5 minutes
		},
	},
})

function RootComponent() {
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<MotionConfig reducedMotion="user">
					<ClerkProvider
						publishableKey={
							import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
						}
					>
						<ThemeProvider>
							<Outlet />
						</ThemeProvider>
					</ClerkProvider>
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
