import { describe, expect, it } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

// Covers spec 0002-auth-flows AC-10: the current session's row never gets a
// revoke control, other sessions can be revoked (with confirmation).
function envelopeResponse(payload: unknown, status = 200): AxiosResponse {
	return {
		data: { success: true, statusCode: status, data: payload, path: "", timestamp: "" },
		status,
		statusText: "OK",
		headers: {},
		config: {} as AxiosResponse["config"],
	}
}

function renderApp() {
	const queryClient = new QueryClient()
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: ["/settings/sessions"] }),
	})

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)

	return { router }
}

const me = {
	id: "1",
	email: "a@b.com",
	displayName: "Test User",
	role: "USER",
	emailVerified: true,
}

const sessions = [
	{
		id: "session-current",
		ip: "127.0.0.1",
		userAgent: "Chrome on this device",
		createdAt: new Date().toISOString(),
		expiresAt: new Date().toISOString(),
		revoked: false,
		current: true,
	},
	{
		id: "session-other",
		ip: "10.0.0.5",
		userAgent: "Firefox on another device",
		createdAt: new Date().toISOString(),
		expiresAt: new Date().toISOString(),
		revoked: false,
		current: false,
	},
]

describe("sessions management", () => {
	it("never renders a revoke control on the current session's row (AC-10)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") return Promise.resolve(envelopeResponse(me))
			if (config.url === "/auth/sessions") return Promise.resolve(envelopeResponse(sessions))
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()

		await screen.findByText("Firefox on another device")

		const rows = screen.getAllByText(/Chrome on this device|Firefox on another device/)
		expect(rows).toHaveLength(2)
		expect(screen.getAllByRole("button", { name: "Révoquer" })).toHaveLength(1)
		expect(screen.getByText("Cet appareil")).toBeInTheDocument()
	})

	it("revokes a non-current session after confirming", async () => {
		let revoked = false
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") return Promise.resolve(envelopeResponse(me))
			if (config.url === "/auth/sessions") return Promise.resolve(envelopeResponse(sessions))
			if (config.url === "/auth/sessions/session-other" && config.method === "delete") {
				revoked = true
				return Promise.resolve(envelopeResponse(undefined, 204))
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()
		await screen.findByText("Firefox on another device")

		await userEvent.click(screen.getByRole("button", { name: "Révoquer" }))
		const dialog = await screen.findByRole("alertdialog")
		await userEvent.click(within(dialog).getByRole("button", { name: "Révoquer" }))

		await waitFor(() => expect(revoked).toBe(true))
	})
})
