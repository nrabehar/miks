import { create } from "zustand"

// Client/UI state only, never server data (spec 0001-frontend-architecture):
// server state always stays in TanStack Query's cache.
interface UiStore {
	sidebarOpen: boolean
	toggleSidebar: () => void
}

export const useUiStore = create<UiStore>((set) => ({
	sidebarOpen: true,
	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
