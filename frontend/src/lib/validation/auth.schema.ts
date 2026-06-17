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

const emailSchema = z.email({ message: 'Invalid email address' })

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
	email: emailSchema,
	password: strongPasswordSchema,
	rememberMe: z.boolean().optional()
})

export type LoginFormData = z.infer<typeof loginSchema>
