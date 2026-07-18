import { afterEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"
import { OAUTH_SUCCESS_MESSAGE } from "#/features/auth/oauth-callback-message"

// Covers spec 0002-auth-flows AC-8: the popup posts to its opener and closes
// itself; if this instead lands as a normal full page navigation (popup was
// blocked, no opener), it just takes the user into the app.
function envelopeError(status: number, message: string): AxiosResponse {
	return {
		data: { success: false, statusCode: status, message, error: "Error", path: "", timestamp: "" },
		status,
		statusText: "Error",
		headers: {},
		config: {} as AxiosResponse["config"],
	}
}

function renderCallback() {
	const queryClient = new QueryClient()
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: ["/auth/oauth-callback"] }),
	})

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)

	return { router }
}

describe("oauth-callback", () => {
	const originalOpener = window.opener

	afterEach(() => {
		Object.defineProperty(window, "opener", {
			configurable: true,
			value: originalOpener,
		})
		vi.restoreAllMocks()
	})

	it("posts the success message to the opener and closes itself when running in a popup", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const postMessage = vi.fn()
		const fakeOpener = { postMessage }
		Object.defineProperty(window, "opener", {
			configurable: true,
			value: fakeOpener,
		})
		const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {})

		renderCallback()

		await waitFor(() => expect(postMessage).toHaveBeenCalledWith(OAUTH_SUCCESS_MESSAGE, window.location.origin))
		expect(closeSpy).toHaveBeenCalled()
	})

	it("navigates into the app instead when there is no opener (popup was blocked, this is a full page landing)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}
		Object.defineProperty(window, "opener", { configurable: true, value: null })

		const { router } = renderCallback()

		await waitFor(() =>
			expect(router.state.location.pathname).not.toBe("/auth/oauth-callback"),
		)
	})
})
