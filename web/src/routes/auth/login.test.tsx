import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

// Covers the login screen: successful sign in (honoring a `redirect` search
// param), and the three distinct error messages the backend's responses map
// to (locked, invalid credentials, generic).
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

function renderApp(initialEntry = "/auth/login") {
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

async function submitLogin(identifier = "ada@example.test", password = "hunter2") {
	await userEvent.type(await screen.findByLabelText("E-mail"), identifier)
	await userEvent.type(screen.getByLabelText("Mot de passe", { exact: true }), password)
	await userEvent.click(screen.getByRole("button", { name: "Se connecter" }))
}

const user = {
	id: "1",
	email: "ada@example.test",
	displayName: "Ada",
	role: "USER",
	emailVerified: true,
}

describe("login", () => {
	it("logs in and lands on the dashboard by default", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/login") {
				return Promise.resolve(
					envelopeResponse({ user, accessToken: "a", refreshToken: "b" }),
				)
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderApp()
		await submitLogin()

		await waitFor(() => expect(router.state.location.pathname).toBe("/"))
	})

	it("honors the redirect search param instead of the dashboard", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/login") {
				return Promise.resolve(
					envelopeResponse({ user, accessToken: "a", refreshToken: "b" }),
				)
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		const { router } = renderApp("/auth/login?redirect=%2Fsettings%2Fsessions")
		await submitLogin()

		await waitFor(() => expect(router.state.location.pathname).toBe("/settings/sessions"))
	})

	it("shows the locked message on a 423", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/login") {
				return Promise.reject({
					isAxiosError: true,
					response: envelopeError(423, "Account locked"),
				})
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()
		await submitLogin()

		expect(
			await screen.findByText(
				"Ce compte est temporairement verrouillé, réessayez plus tard",
			),
		).toBeInTheDocument()
	})

	it("shows the invalid-credentials message on a 401", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/login") {
				return Promise.reject({
					isAxiosError: true,
					response: envelopeError(401, "Invalid credentials"),
				})
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()
		await submitLogin()

		expect(
			await screen.findByText("Identifiant ou mot de passe incorrect"),
		).toBeInTheDocument()
	})

	it("shows a generic error on any other failure", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/login") {
				return Promise.reject({
					isAxiosError: true,
					response: envelopeError(500, "Internal error"),
				})
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()
		await submitLogin()

		expect(
			await screen.findByText("La connexion a échoué, réessayez"),
		).toBeInTheDocument()
	})

	it("disables the submit button while the request is pending", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/login") {
				return new Promise(() => {}) // never resolves within the test
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()
		await submitLogin()

		expect(
			await screen.findByRole("button", { name: "Connexion en cours..." }),
		).toBeDisabled()
	})
})
