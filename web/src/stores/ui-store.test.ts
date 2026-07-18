import { describe, expect, it } from "vitest"
import { useUiStore } from "./ui-store"

describe("useUiStore", () => {
	it("toggles sidebarOpen", () => {
		const initial = useUiStore.getState().sidebarOpen
		useUiStore.getState().toggleSidebar()
		expect(useUiStore.getState().sidebarOpen).toBe(!initial)
	})
})
