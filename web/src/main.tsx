import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import "./lib/i18n"
import { initErrorReporting } from "#/lib/sentry"
import { queryClient } from "#/lib/query/client"
import { queryPersister } from "#/lib/query/persister"
import { onSessionExpired } from "#/lib/api/client"
import { router } from "./router"
import "./index.css"

initErrorReporting()

function App() {
	useEffect(
		() =>
			onSessionExpired(() => {
				void router.navigate({
					to: "/auth/login",
					search: { redirect: router.state.location.href },
				})
			}),
		[],
	)

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{ persister: queryPersister }}
		>
			<RouterProvider router={router} />
		</PersistQueryClientProvider>
	)
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
