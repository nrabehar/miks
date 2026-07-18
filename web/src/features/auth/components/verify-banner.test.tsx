import { afterEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { authKeys } from "#/features/auth/queries"
import type { User } from "#/features/auth/schema"
import { VerifyBanner } from "./verify-banner"

const DISMISSED_KEY = "miks:verify-banner-dismissed"

const baseUser: User = {
	id: "1",
	email: "a@b.com",
	displayName: "Ada",
	role: "USER",
	emailVerified: false,
}

function renderBanner(user: User | null) {
	const queryClient = new QueryClient()
	queryClient.setQueryData(authKeys.me(), user)

	return render(
		<QueryClientProvider client={queryClient}>
			<VerifyBanner />
		</QueryClientProvider>,
	)
}

describe("VerifyBanner", () => {
	afterEach(() => {
		sessionStorage.clear()
	})

	it("shows the banner while the user's email is unverified", () => {
		renderBanner(baseUser)

		expect(
			screen.getByText("Vérifiez votre adresse e-mail pour sécuriser votre compte."),
		).toBeInTheDocument()
	})

	it("renders nothing once the user's email is verified", () => {
		renderBanner({ ...baseUser, emailVerified: true })

		expect(
			screen.queryByText("Vérifiez votre adresse e-mail pour sécuriser votre compte."),
		).not.toBeInTheDocument()
	})

	it("renders nothing while there is no logged in user", () => {
		renderBanner(null)

		expect(
			screen.queryByText("Vérifiez votre adresse e-mail pour sécuriser votre compte."),
		).not.toBeInTheDocument()
	})

	it("hides itself for the rest of the session once dismissed", async () => {
		renderBanner(baseUser)

		await userEvent.click(screen.getByRole("button", { name: "Masquer" }))

		expect(
			screen.queryByText("Vérifiez votre adresse e-mail pour sécuriser votre compte."),
		).not.toBeInTheDocument()
		expect(sessionStorage.getItem(DISMISSED_KEY)).toBe("1")
	})

	it("stays hidden on a fresh mount within the same session (sessionStorage, not local state)", () => {
		sessionStorage.setItem(DISMISSED_KEY, "1")

		renderBanner(baseUser)

		expect(
			screen.queryByText("Vérifiez votre adresse e-mail pour sécuriser votre compte."),
		).not.toBeInTheDocument()
	})

	it("the dismiss button has an accessible name", () => {
		renderBanner(baseUser)

		expect(screen.getByRole("button", { name: "Masquer" })).toBeInTheDocument()
	})
})
