import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

// Covers spec 0002-auth-flows AC-3 (auto-submit on load, clear success
// state) and AC-4 (expired/used token offers resend, not a generic failure).
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

function renderApp(initialEntry: string) {
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

describe("verify-email", () => {
	it("auto-submits the URL token and shows success with no extra click (AC-3)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/verify") {
				return Promise.resolve(envelopeResponse({ verified: true }))
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp("/auth/verify-email?token=good-token")

		expect(
			await screen.findByText("Votre adresse e-mail est vérifiée."),
		).toBeInTheDocument()
	})

	it("offers a resend action instead of a generic failure on an expired/used token (AC-4)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/verify") {
				return Promise.reject({ response: envelopeError(400, "Expired token") })
			}
			if (config.url === "/auth/resend-verification") {
				return Promise.resolve(envelopeResponse(undefined, 202))
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp("/auth/verify-email?token=dead-token")

		expect(
			await screen.findByText(
				"Ce lien de vérification est invalide ou a déjà été utilisé.",
			),
		).toBeInTheDocument()

		await userEvent.type(screen.getByLabelText("E-mail"), "a@b.com")
		await userEvent.click(
			screen.getByRole("button", { name: "Renvoyer un lien de vérification" }),
		)

		expect(
			await screen.findByText(
				"Un nouveau lien de vérification a été envoyé si ce compte existe.",
			),
		).toBeInTheDocument()
	})
})
