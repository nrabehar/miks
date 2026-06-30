import z from 'zod'

const strongPasswordSchema = z
	.string()
	.min(8, { message: 'Must be at least 8 characters long' })
	.max(25, { message: 'Must be at most 25 characters long' })
	.regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter' })
	.regex(/[a-z]/, { message: 'Must contain at least one lowercase letter' })
	.regex(/[0-9]/, { message: 'Must contain at least one number' })
	.regex(/[^A-Za-z0-9]/, { message: 'Must contain at least one special character' })

export const loginSchema = z.object({
	email: z.email({ message: 'Invalid email address' }),
	password: z.string().min(1, { message: 'Password is required' }),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z
	.object({
		firstName: z.string().min(1, { message: 'First name is required' }),
		lastName: z.string().min(1, { message: 'Last name is required' }),
		email: z.email({ message: 'Invalid email address' }).max(255),
		password: strongPasswordSchema,
		confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
		cgu: z.boolean().refine((val) => val === true, {
			message: 'You must accept the terms and conditions',
		}),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	});

export type RegisterFormData = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
	email: z.email({ message: 'Invalid email address' }),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
	.object({
		code: z.string().length(6, { message: 'Code must be exactly 6 characters' }),
		password: strongPasswordSchema,
		confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
