import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

// Covers the frontend foundation spec's root layout / protected route
// contract (docs/specs/web/0001-frontend-architecture), and two bugs
// /check verify found in a real browser: (1) __root's auth check was a
// `loader`, which TanStack Router always resolves after every matched
// route's `beforeLoad`, so `_authenticated`'s guard saw an empty cache on
// every fresh page load; (2) logging out cleared the query cache but never
// navigated away, leaving the user stuck on a half cleared dashboard.
function envelopeResponse(payload: unknown, status = 200): AxiosResponse {
	return {
		data: { success: true, statusCode: status, data: payload, path: "", timestamp: "" },
		status,
		statusText: "OK",
		headers: {},
		config: {} as AxiosResponse["config"],
	}
}

function envelopeError(status: number, message: string): AxiosResponse {
	return {
		data: { success: false, statusCode: status, message, error: "Error", path: "", timestamp: "" },
		status,
		statusText: "Error",
		headers: {},
		config: {} as AxiosResponse["config"],
	}
}

function renderApp() {
	const queryClient = new QueryClient()
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: ["/"] }),
	})

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)

	return { router, queryClient }
}

describe("root auth guard (covers: root layout checks who is logged in via /auth/me)", () => {
	it("renders the dashboard when /auth/me resolves a real session", async () => {
		const user = { id: "1", email: "a@b.com", displayName: "Test User", role: "USER" }
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") return Promise.resolve(envelopeResponse(user))
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()

		await screen.findByText(/Test User/)
	})

	it("redirects to /auth/login when /auth/me is unauthenticated (covers: protected routes redirect when not authenticated)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") return Promise.reject({ response: envelopeError(401, "No auth token") })
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderApp()

		await waitFor(() => expect(router.state.location.pathname).toBe("/auth/login"))
		expect(router.state.location.search).toEqual({ redirect: "/" })
	})
})

describe("dashboard", () => {
	it("logout menu item is reachable by keyboard and has an accessible name", async () => {
		const user = { id: "1", email: "a@b.com", displayName: "Test User", role: "USER" }
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") return Promise.resolve(envelopeResponse(user))
			if (config.url === "/auth/logout") return Promise.resolve(envelopeResponse(null, 204))
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()
		await screen.findByText(/Test User/)

		const trigger = screen.getByRole("button", { name: "TU" })
		const user_ = userEvent.setup()
		await user_.tab()
		while (document.activeElement !== trigger) {
			await user_.tab()
		}
		await user_.keyboard("{Enter}")

		expect(await screen.findByText("Se déconnecter")).toBeInTheDocument()
	})

	it("navigates to /auth/login once logout succeeds", async () => {
		const user = { id: "1", email: "a@b.com", displayName: "Test User", role: "USER" }

		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") return Promise.resolve(envelopeResponse(user))
			if (config.url === "/auth/logout") return Promise.resolve(envelopeResponse(null, 204))
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderApp()

		await screen.findByText(/Test User/)

		await userEvent.click(screen.getByRole("button", { name: "TU" }))
		await userEvent.click(await screen.findByText("Se déconnecter"))

		await waitFor(() => expect(router.state.location.pathname).toBe("/auth/login"))
	})

	it("stays on the dashboard without crashing when logout fails", async () => {
		const user = { id: "1", email: "a@b.com", displayName: "Test User", role: "USER" }

		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") return Promise.resolve(envelopeResponse(user))
			if (config.url === "/auth/logout") {
				return Promise.reject({ response: envelopeError(500, "Internal error") })
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderApp()
		await screen.findByText(/Test User/)

		await userEvent.click(screen.getByRole("button", { name: "TU" }))
		await userEvent.click(await screen.findByText("Se déconnecter"))

		// Give the rejected mutation a tick to settle, then confirm the app
		// neither navigated away nor crashed to an error boundary.
		await new Promise((resolve) => setTimeout(resolve, 50))
		expect(router.state.location.pathname).toBe("/")
		expect(screen.getByText(/Test User/)).toBeInTheDocument()
	})
})
