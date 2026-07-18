import { z } from "zod"

// Mirrors GET /auth/me's AuthenticatedUser shape (api/src/common/guards/jwt-auth.guard.ts).
export const userSchema = z.object({
	id: z.string(),
	email: z.email().nullable(),
	displayName: z.string(),
	role: z.string(),
})

export type User = z.infer<typeof userSchema>

export const loginSchema = z.object({
	identifier: z.email("Entrez une adresse e-mail valide"),
	password: z.string().min(1, "Le mot de passe est requis"),
})

export type LoginInput = z.infer<typeof loginSchema>
