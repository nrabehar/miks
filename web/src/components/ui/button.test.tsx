import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button } from "./button"

describe("Button", () => {
	it("renders its label and responds to a click", async () => {
		const onClick = vi.fn()
		const user = userEvent.setup()

		render(<Button onClick={onClick}>Se connecter</Button>)

		const button = screen.getByRole("button", { name: "Se connecter" })
		await user.click(button)

		expect(onClick).toHaveBeenCalledTimes(1)
	})

	it("disables the button and blocks clicks when disabled", async () => {
		const onClick = vi.fn()
		const user = userEvent.setup()

		render(
			<Button disabled onClick={onClick}>
				Se connecter
			</Button>,
		)

		await user.click(screen.getByRole("button", { name: "Se connecter" }))

		expect(onClick).not.toHaveBeenCalled()
	})
})
