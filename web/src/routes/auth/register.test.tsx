import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

// Covers spec 0002-auth-flows AC-1: register logs the user in immediately
// (no verification gate), and the 409 email-taken failure case.
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
		history: createMemoryHistory({ initialEntries: ["/auth/register"] }),
	})

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)

	return { router }
}

async function fillForm() {
	await userEvent.type(await screen.findByLabelText("Nom"), "New User")
	await userEvent.type(screen.getByLabelText("E-mail"), "new@user.test")
	await userEvent.type(screen.getByLabelText("Mot de passe"), "password123")
	await userEvent.type(screen.getByLabelText("Confirmer le mot de passe"), "password123")
	await userEvent.click(screen.getByRole("button", { name: "Créer mon compte" }))
}

describe("register", () => {
	it("logs the user in immediately on success and lands in the app (AC-1)", async () => {
		const user = {
			id: "1",
			email: "new@user.test",
			displayName: "New User",
			role: "USER",
			emailVerified: false,
		}

		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/register") {
				return Promise.resolve(
					envelopeResponse({ user, accessToken: "a", refreshToken: "b" }),
				)
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderApp()
		await fillForm()

		await waitFor(() => expect(router.state.location.pathname).toBe("/"))
	})

	it("shows a conflict error when the email is already taken", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/register") {
				return Promise.reject({
					isAxiosError: true,
					response: envelopeError(409, "Email taken"),
				})
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()
		await fillForm()

		expect(
			await screen.findByText("Cette adresse e-mail est déjà utilisée"),
		).toBeInTheDocument()
	})
})
