import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import {
	PersistQueryClientProvider,
	persistQueryClientRestore,
} from "@tanstack/react-query-persist-client"
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

// Restore the persisted cache before the router ever runs a loader/beforeLoad.
// __root's beforeLoad reads the query cache synchronously (via
// ensureQueryData); PersistQueryClientProvider's own restore happens in a
// useEffect, which fires after that first beforeLoad already ran, so an
// offline reload always found an empty cache and looked logged out even
// with valid persisted data sitting in IndexedDB (found by /check verify).
await persistQueryClientRestore({ queryClient, persister: queryPersister })

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
