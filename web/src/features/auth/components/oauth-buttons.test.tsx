import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

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
})
