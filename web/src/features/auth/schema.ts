import { z } from "zod"

// Mirrors GET /auth/me's AuthenticatedUser shape (api/src/common/guards/jwt-auth.guard.ts).
export const userSchema = z.object({
	id: z.string(),
	email: z.email().nullable(),
	displayName: z.string(),
	role: z.string(),
	emailVerified: z.boolean(),
})

export type User = z.infer<typeof userSchema>

export const loginSchema = z.object({
	identifier: z.email("Entrez une adresse e-mail valide"),
	password: z.string().min(1, "Le mot de passe est requis"),
})

export type LoginInput = z.infer<typeof loginSchema>

// A login/register/OAuth callback response is either tokens for an already
// trusted device, or a request to confirm a device never seen before (spec
// 0001-authentication's 2026-07-18 addendum, AC-15).
export const deviceConfirmationRequiredSchema = z.object({
	requiresDeviceConfirmation: z.literal(true),
	confirmationId: z.string(),
})

export type DeviceConfirmationRequired = z.infer<
	typeof deviceConfirmationRequiredSchema
>

// The API always emails a 6 digit numeric code (device.service.ts's
// generateCode); validating the exact shape client side catches a typo
// before a round trip, instead of surfacing the backend's generic 400.
export const confirmDeviceSchema = z.object({
	code: z
		.string()
		.regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
})

export type ConfirmDeviceInput = z.infer<typeof confirmDeviceSchema>

// Backend's RegisterDto requires an 8+ char password (api/src/modules/auth/dto/register.dto.ts).
export const registerSchema = z
	.object({
		email: z.email("Entrez une adresse e-mail valide"),
		password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
		confirmPassword: z.string().min(1, "Confirmez votre mot de passe"),
		displayName: z.string().min(1, "Le nom est requis"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	})

export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
	identifier: z.email("Entrez une adresse e-mail valide"),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
	.object({
		password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
		confirmPassword: z.string().min(1, "Confirmez votre mot de passe"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Mirrors the shape returned by GET /auth/sessions (api/src/modules/auth/auth.controller.ts).
// deviceName/deviceType/platform are derived from the User-Agent server side
// (spec 0001-authentication's 2026-07-18 addendum, AC-20), never raw here.
export const sessionSchema = z.object({
	id: z.string(),
	ip: z.string().nullable(),
	userAgent: z.string().nullable(),
	deviceName: z.string().nullable(),
	deviceType: z.string().nullable(),
	platform: z.string().nullable(),
	lastActiveAt: z.string(),
	createdAt: z.string(),
	expiresAt: z.string(),
	revoked: z.boolean(),
	current: z.boolean(),
})

export type Session = z.infer<typeof sessionSchema>

export const sessionsSchema = z.array(sessionSchema)
