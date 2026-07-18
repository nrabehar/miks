import { afterEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"
import {
	OAUTH_CHANNEL_NAME,
	OAUTH_POPUP_WINDOW_NAME,
	OAUTH_SUCCESS_MESSAGE,
} from "#/features/auth/oauth-callback-message"

// Covers spec 0002-auth-flows AC-8: the popup (identified via window.name,
// not window.opener, which the OAuth provider's own Cross-Origin-Opener-Policy
// header permanently severs) broadcasts success and closes itself; if this
// instead lands as a normal full page navigation (popup was blocked, no
// special window.name), it just takes the user into the app.
function envelopeError(status: number, message: string): AxiosResponse {
	return {
		data: { success: false, statusCode: status, message, error: "Error", path: "", timestamp: "" },
		status,
		statusText: "Error",
		headers: {},
		config: {} as AxiosResponse["config"],
	}
}

function renderCallback(initialEntry = "/auth/oauth-callback") {
	const queryClient = new QueryClient()
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: [initialEntry] }),
	})

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)

	return { router }
}

describe("oauth-callback", () => {
	const originalName = window.name

	afterEach(() => {
		window.name = originalName
		vi.restoreAllMocks()
	})

	it("broadcasts the success message and closes itself when running in the OAuth popup", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		window.name = OAUTH_POPUP_WINDOW_NAME
		const received: unknown[] = []
		const listenerChannel = new BroadcastChannel(OAUTH_CHANNEL_NAME)
		listenerChannel.onmessage = (event) => received.push(event.data)
		const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {})

		renderCallback()

		await waitFor(() => expect(received).toContain(OAUTH_SUCCESS_MESSAGE))
		expect(closeSpy).toHaveBeenCalled()
		listenerChannel.close()
	})

	it("hands off to /auth/login's device confirmation step, not crashing on the boolean search param (spec 0001-authentication AC-15)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		// The router's default search parser JSON-parses raw query values, so
		// `?requiresDeviceConfirmation=true` arrives as the boolean `true`, not
		// the string `"true"` — this regression tests that parsing doesn't
		// throw a validation error (it used to, against a `z.enum(["true"])`).
		const { router } = renderCallback(
			"/auth/oauth-callback?requiresDeviceConfirmation=true&confirmationId=confirmation-1",
		)

		await waitFor(() =>
			expect(router.state.location.pathname).toBe("/auth/login"),
		)
		expect(router.state.location.search).toMatchObject({
			confirmationId: "confirmation-1",
		})
	})

	it("navigates into the app instead when this is a normal full page landing (popup was blocked)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}
		window.name = ""

		const { router } = renderCallback()

		await waitFor(() =>
			expect(router.state.location.pathname).not.toBe("/auth/oauth-callback"),
		)
	})
})
