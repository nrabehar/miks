import { queryOptions } from "@tanstack/react-query"
import { fetchMe, fetchSessions } from "./api"

export const authKeys = {
	all: ["auth"] as const,
	me: () => [...authKeys.all, "me"] as const,
	sessions: () => [...authKeys.all, "sessions"] as const,
}

// 401 (not logged in) is a normal, expected outcome here, not a transient
// fault: retrying it would just re-trigger the refresh flow in the API
// client for nothing.
export const meQueryOptions = queryOptions({
	queryKey: authKeys.me(),
	queryFn: fetchMe,
	retry: false,
})

export const sessionsQueryOptions = queryOptions({
	queryKey: authKeys.sessions(),
	queryFn: fetchSessions,
})
