import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get, set, del } from "idb-keyval"

// TanStack Query's cache persisted to IndexedDB so already loaded data (a
// workspace's balances, history) stays visible offline or on a bad
// connection. Mutations that change money state are never queued offline
// (spec 0001-frontend-architecture): this only rehydrates cached reads.
export const queryPersister = createAsyncStoragePersister({
	storage: {
		getItem: (key: string) => get(key),
		setItem: (key: string, value: string) => set(key, value),
		removeItem: (key: string) => del(key),
	},
	key: "miks-query-cache",
})
