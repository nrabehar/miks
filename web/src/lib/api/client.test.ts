import { describe, expect, it } from "vitest"
import axios, { type AxiosResponse } from "axios"
import { apiClient } from "./client"

// Regression test for the response envelope bug found by /check verify: the
// API wraps every successful response in { success, statusCode, data, path,
// timestamp } (api/src/common/interceptors/transform.interceptor.ts). Before
// the fix, apiClient handed callers the whole envelope instead of its `data`,
// so every feature's Zod schema (e.g. userSchema.parse) failed to parse a
// real, successful response.
function fakeEnvelopeResponse(payload: unknown): AxiosResponse {
	return {
		data: {
			success: true,
			statusCode: 200,
			data: payload,
			path: "/auth/me",
			timestamp: new Date(0).toISOString(),
		},
		status: 200,
		statusText: "OK",
		headers: {},
		config: { headers: axios.AxiosHeaders.from({}) } as AxiosResponse["config"],
	}
}

describe("apiClient response envelope unwrap", () => {
	it("unwraps { success, data } into just the payload", async () => {
		apiClient.defaults.adapter = () =>
			Promise.resolve(fakeEnvelopeResponse({ id: "1", email: "a@b.com" }))

		const response = await apiClient.get("/auth/me")

		expect(response.data).toEqual({ id: "1", email: "a@b.com" })
	})

	it("passes through a response that isn't the success envelope unchanged", async () => {
		apiClient.defaults.adapter = () =>
			Promise.resolve({
				...fakeEnvelopeResponse(null),
				data: "",
				status: 204,
			})

		const response = await apiClient.post("/auth/logout")

		expect(response.data).toBe("")
	})
})
