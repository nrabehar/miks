import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

// Covers spec 0002-auth-flows AC-6 (password + confirmation submitted with
// the URL token) and AC-7 (an already-used token replaces the form with an
// error state offering a fresh link, instead of resubmitting against it).
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

describe("reset-password", () => {
	it("submits the new password with the URL token and returns to login (AC-6)", async () => {
		let sentBody: unknown
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/reset-password") {
				sentBody = JSON.parse(config.data as string)
				return Promise.resolve(envelopeResponse({ reset: true }))
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderApp("/auth/reset-password?token=good-token")

		await userEvent.type(
			await screen.findByLabelText("Nouveau mot de passe"),
			"newpassword1",
		)
		await userEvent.type(
			screen.getByLabelText("Confirmer le mot de passe"),
			"newpassword1",
		)
		await userEvent.click(screen.getByRole("button", { name: "Réinitialiser" }))

		await waitFor(() => expect(router.state.location.pathname).toBe("/auth/login"))
		expect(sentBody).toEqual({ token: "good-token", password: "newpassword1" })
	})

	it("replaces the form with an error state and a fresh-link action on an already-used token (AC-7)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/reset-password") {
				return Promise.reject({
					isAxiosError: true,
					response: envelopeError(409, "Token already used"),
				})
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp("/auth/reset-password?token=dead-token")

		await userEvent.type(
			await screen.findByLabelText("Nouveau mot de passe"),
			"newpassword1",
		)
		await userEvent.type(
			screen.getByLabelText("Confirmer le mot de passe"),
			"newpassword1",
		)
		await userEvent.click(screen.getByRole("button", { name: "Réinitialiser" }))

		expect(
			await screen.findByText(
				"Ce lien de réinitialisation est invalide ou a déjà été utilisé.",
			),
		).toBeInTheDocument()
		expect(
			screen.getByRole("link", { name: "Demander un nouveau lien" }),
		).toBeInTheDocument()
		expect(screen.queryByLabelText("Nouveau mot de passe")).not.toBeInTheDocument()
	})
})
