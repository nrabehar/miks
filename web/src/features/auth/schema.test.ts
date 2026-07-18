import { describe, expect, it } from "vitest"
import {
	forgotPasswordSchema,
	loginSchema,
	registerSchema,
	resetPasswordSchema,
	sessionSchema,
	sessionsSchema,
	userSchema,
} from "./schema"

describe("loginSchema", () => {
	it("accepts a valid email and non empty password", () => {
		const result = loginSchema.safeParse({
			identifier: "user@example.com",
			password: "hunter2",
		})

		expect(result.success).toBe(true)
	})

	it("rejects an invalid email", () => {
		const result = loginSchema.safeParse({
			identifier: "not-an-email",
			password: "hunter2",
		})

		expect(result.success).toBe(false)
	})

	it("rejects an empty password", () => {
		const result = loginSchema.safeParse({
			identifier: "user@example.com",
			password: "",
		})

		expect(result.success).toBe(false)
	})
})

describe("userSchema", () => {
	it("requires emailVerified, matching GET /auth/me's AuthenticatedUser shape", () => {
		const withoutEmailVerified = {
			id: "1",
			email: "user@example.com",
			displayName: "Ada",
			role: "USER",
		}

		expect(userSchema.safeParse(withoutEmailVerified).success).toBe(false)
		expect(
			userSchema.safeParse({ ...withoutEmailVerified, emailVerified: false }).success,
		).toBe(true)
	})

	it("accepts a null email (phone only accounts have no email)", () => {
		const result = userSchema.safeParse({
			id: "1",
			email: null,
			displayName: "Ada",
			role: "USER",
			emailVerified: true,
		})

		expect(result.success).toBe(true)
	})
})

describe("registerSchema", () => {
	const valid = {
		email: "user@example.com",
		password: "password123",
		confirmPassword: "password123",
		displayName: "Ada",
	}

	it("accepts matching passwords of at least 8 characters", () => {
		expect(registerSchema.safeParse(valid).success).toBe(true)
	})

	it("rejects a password shorter than 8 characters", () => {
		const result = registerSchema.safeParse({
			...valid,
			password: "short1",
			confirmPassword: "short1",
		})

		expect(result.success).toBe(false)
	})

	it("rejects mismatched password and confirmPassword, flagging confirmPassword", () => {
		const result = registerSchema.safeParse({
			...valid,
			confirmPassword: "different123",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(["confirmPassword"])
		}
	})

	it("rejects an empty display name", () => {
		const result = registerSchema.safeParse({ ...valid, displayName: "" })

		expect(result.success).toBe(false)
	})
})

describe("forgotPasswordSchema", () => {
	it("accepts a valid email identifier", () => {
		expect(
			forgotPasswordSchema.safeParse({ identifier: "user@example.com" }).success,
		).toBe(true)
	})

	it("rejects a non email identifier", () => {
		expect(forgotPasswordSchema.safeParse({ identifier: "not-an-email" }).success).toBe(
			false,
		)
	})
})

describe("resetPasswordSchema", () => {
	it("accepts matching passwords of at least 8 characters", () => {
		const result = resetPasswordSchema.safeParse({
			password: "password123",
			confirmPassword: "password123",
		})

		expect(result.success).toBe(true)
	})

	it("rejects mismatched password and confirmPassword, flagging confirmPassword", () => {
		const result = resetPasswordSchema.safeParse({
			password: "password123",
			confirmPassword: "different123",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(["confirmPassword"])
		}
	})

	it("rejects a password shorter than 8 characters", () => {
		const result = resetPasswordSchema.safeParse({
			password: "short1",
			confirmPassword: "short1",
		})

		expect(result.success).toBe(false)
	})
})

describe("sessionSchema / sessionsSchema", () => {
	const validSession = {
		id: "session-1",
		ip: "127.0.0.1",
		userAgent: "Chrome",
		deviceName: "Chrome on Windows",
		deviceType: "WEB",
		platform: "Windows",
		lastActiveAt: "2026-07-18T00:00:00.000Z",
		createdAt: "2026-07-18T00:00:00.000Z",
		expiresAt: "2026-08-18T00:00:00.000Z",
		revoked: false,
		current: true,
	}

	it("accepts a well formed session, matching GET /auth/sessions' shape", () => {
		expect(sessionSchema.safeParse(validSession).success).toBe(true)
	})

	it("accepts null ip and userAgent (not every session has them)", () => {
		const result = sessionSchema.safeParse({
			...validSession,
			ip: null,
			userAgent: null,
		})

		expect(result.success).toBe(true)
	})

	it("rejects a session missing the current flag", () => {
		const { current, ...withoutCurrent } = validSession
		void current

		expect(sessionSchema.safeParse(withoutCurrent).success).toBe(false)
	})

	it("parses an array of sessions, including an empty list", () => {
		expect(sessionsSchema.safeParse([validSession, validSession]).success).toBe(true)
		expect(sessionsSchema.safeParse([]).success).toBe(true)
	})
})
