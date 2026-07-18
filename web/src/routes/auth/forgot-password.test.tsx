import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import type { AxiosResponse } from "axios"
import { apiClient } from "#/lib/api/client"
import { routeTree } from "#/routeTree.gen"

// Covers spec 0002-auth-flows AC-5 (always the same generic confirmation)
// and AC-11 (the resend/forgot-password rate limit shows a specific
// message and a cooldown instead of the generic error).
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
		history: createMemoryHistory({ initialEntries: ["/auth/forgot-password"] }),
	})

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	)

	return { router }
}

describe("forgot-password", () => {
	it("always shows the same generic confirmation on submit (AC-5)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/forgot-password") {
				return Promise.resolve(envelopeResponse(undefined, 202))
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()

		await userEvent.type(await screen.findByLabelText("E-mail"), "unknown@user.test")
		await userEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }))

		expect(
			await screen.findByText(
				"Si un compte existe avec cette adresse, un e-mail vient d'être envoyé.",
			),
		).toBeInTheDocument()
	})

	it("shows the rate limit message and disables the action on a 429 (AC-11)", async () => {
		apiClient.defaults.adapter = (config) => {
			if (config.url === "/auth/me") {
				return Promise.reject({ response: envelopeError(401, "No auth token") })
			}
			if (config.url === "/auth/forgot-password") {
				return Promise.reject({
					isAxiosError: true,
					response: envelopeError(429, "Too many requests"),
				})
			}
			return Promise.reject(new Error(`unexpected request: ${config.url}`))
		}

		renderApp()

		await userEvent.type(await screen.findByLabelText("E-mail"), "unknown@user.test")
		await userEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }))

		expect(
			await screen.findByText("Trop de tentatives, réessayez dans quelques instants"),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Réessayez dans \d+s/ })).toBeDisabled()
	})
})
