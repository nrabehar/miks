import { ThemeProvider } from '#/components/provider/theme.provider'
import { Toaster } from '#/components/ui/sonner'
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
			staleTime: 5 * 60 * 1000,
		},
	},
})

function RootComponent() {
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
