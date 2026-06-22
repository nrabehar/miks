import z from 'zod'

const strongPasswordSchema = z
	.string()
	.min(8, { message: 'Password must be at least 8 characters long' })
	.max(25, { message: 'Password must be at most 25 characters long' })
	.regex(/[A-Z]/, {
		message: 'Password must contain at least one uppercase letter',
	})
	.regex(/[a-z]/, {
		message: 'Password must contain at least one lowercase letter',
	})
	.regex(/[0-9]/, { message: 'Password must contain at least one number' })
	.regex(/[^A-Za-z0-9]/, {
		message: 'Password must contain at least one special character',
	})

const identifierSchema = z
	.string()
	.min(1, { message: 'Identifier is required' })

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
	identifier: identifierSchema,
	password: strongPasswordSchema,
	rememberMe: z.boolean().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
	firstName: z.string().min(1, { message: 'First name is required' }),
	lastName: z.string().min(1, { message: 'Last name is required' }),
	email: z.email({ message: 'Invalid email address' }),
	password: strongPasswordSchema,
})

export type RegisterFormData = z.infer<typeof registerSchema>