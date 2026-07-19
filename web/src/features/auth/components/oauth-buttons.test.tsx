import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"
import {
	OAUTH_CHANNEL_NAME,
	OAUTH_SUCCESS_MESSAGE,
} from "#/features/auth/oauth-callback-message"

// Covers spec 0002-auth-flows AC-9: if the popup is blocked, the button
// falls back to a full page redirect to the same OAuth URL instead of
// failing silently.
function envelopeError(status: number, message: string): AxiosResponse {
	return {
		data: { success: false, statusCode: status, message, error: "Error", path: "", timestamp: "" },
		status,
		statusText: "Error",
		headers: {},
		config: {} as AxiosResponse["config"],
	}
}

function renderLoginPage() {
	const queryClient = new QueryClient()
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: ["/auth/login"] }),
	})

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)

	return { router }
}

describe("OAuth buttons", () => {
	let originalLocation: Location

	beforeEach(() => {
		originalLocation = window.location
		// jsdom doesn't implement navigation, so a plain `window.location.href =`
		// assignment silently no-ops; swap in a plain stub that just records it.
		Object.defineProperty(window, "location", {
			configurable: true,
			value: { ...originalLocation, href: originalLocation.href },
		})
	})

	afterEach(() => {
		Object.defineProperty(window, "location", {
			configurable: true,
			value: originalLocation,
		})
		vi.restoreAllMocks()
	})

	it("falls back to a full page redirect when the popup is blocked (AC-9)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}
		vi.spyOn(window, "open").mockReturnValue(null)

		renderLoginPage()

		await userEvent.click(
			await screen.findByRole("button", { name: "Continuer avec Google" }),
		)

		expect(window.location.href).toContain("/auth/google")
	})

	it("handles the popup's success broadcast exactly once, landing on / without bouncing back to /auth/login", async () => {
		// Both the Google and Facebook buttons are mounted at the same time on
		// this page. A regression here: each button used to open its own
		// BroadcastChannel listener, so a single success broadcast fired in
		// both at once, each independently calling navigate("/"), racing the
		// auth guard's own redirect and bouncing the user back to
		// /auth/login (found live via Sentry's navigation breadcrumbs: four
		// alternating /auth/login <-> / navigations within 38ms). There must
		// be exactly one listener now, so this must resolve cleanly to "/".
		let meCallCount = 0
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				meCallCount += 1
				return Promise.resolve({
					data: {
						success: true,
						statusCode: 200,
						data: {
							id: "1",
							email: "ada@example.test",
							displayName: "Ada",
							role: "USER",
							emailVerified: true,
						},
						path: "",
						timestamp: "",
					},
					status: 200,
					statusText: "OK",
					headers: {},
					config: {} as AxiosResponse["config"],
				})
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderLoginPage()
		await screen.findByRole("button", { name: "Continuer avec Google" })

		const channel = new BroadcastChannel(OAUTH_CHANNEL_NAME)
		channel.postMessage(OAUTH_SUCCESS_MESSAGE)
		channel.close()

		await waitFor(() => expect(router.state.location.pathname).toBe("/"))
		// Give any duplicate/racing navigation a moment to have fired if the
		// regression were still present, then confirm it settled on "/".
		await new Promise((resolve) => setTimeout(resolve, 100))
		expect(router.state.location.pathname).toBe("/")
		expect(meCallCount).toBeGreaterThan(0)
	})
})
