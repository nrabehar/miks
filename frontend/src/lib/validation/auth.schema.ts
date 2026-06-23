import z from 'zod'

const strongPasswordSchema = z
	.string()
	.min(8, { message: 'Must be at least 8 characters long' })
	.max(25, { message: 'Must be at most 25 characters long' })
	.regex(/[A-Z]/, {
		message: 'Must contain at least one uppercase letter',
	})
	.regex(/[a-z]/, {
		message: 'Must contain at least one lowercase letter',
	})
	.regex(/[0-9]/, { message: 'Must contain at least one number' })
	.regex(/[^A-Za-z0-9]/, {
		message: 'Must contain at least one special character',
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
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z
	.object({
		firstName: z.string().min(1, { message: 'First name is required' }),
		lastName: z.string().min(1, { message: 'Last name is required' }),
		email: z.email({ message: 'Invalid email address' }).max(255),
		phone: z
			.string()
			.regex(/^\+?[0-9]{8,15}$/, { message: 'Invalid phone number' }),
		password: strongPasswordSchema,
		confirm: z.string(),
		cgu: z.refine((val) => val === true, {
			message: 'You must accept the terms and conditions',
		}),
	})
	.refine((data) => data.password === data.confirm, {
		message: 'Passwords do not match',
		path: ['confirm'],
	})

export type RegisterFormData = z.infer<typeof registerSchema>
