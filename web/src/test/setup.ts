import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import "#/lib/i18n"

afterEach(() => {
	cleanup()
})

// jsdom has no matchMedia; Radix/shadcn components (e.g. dropdown-menu) call
// it for OS-level media queries.
window.matchMedia ??= (query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: () => {},
	removeListener: () => {},
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => false,
})
