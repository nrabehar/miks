import { AuthCard } from '#/components/auth/auth-card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { PasswordInput } from '#/components/ui/password-input'
import { authApi } from '#/lib/api'
import { resetPasswordSchema } from '#/lib/validation/auth.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { CheckCircle2Icon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/auth/reset-password')({
	validateSearch: z.object({
		userId: z.string().optional(),
		token: z
			.union([z.string(), z.number()])
			.transform((v) => String(v))
			.optional(),
	}),
	component: ResetPasswordPage,
})

function ResetPasswordPage() {
	const navigate = useNavigate()
	const { userId = '', token = '' } = useSearch({ from: '/_auth/auth/reset-password' })
	const [success, setSuccess] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { code: token, password: '', confirmPassword: '' },
	})

	const mutation = useMutation({
		mutationFn: (data: { code: string; password: string }) =>
			authApi.resetPassword({ userId, code: data.code, newPassword: data.password }),
		onSuccess: () => setSuccess(true),
		onError: (err: any) => {
			const msg: string = err.response?.data?.message ?? ''
			if (msg.toLowerCase().includes('expired')) {
				toast.error('Reset code expired.', {
					description: 'Please request a new password reset.',
					action: {
						label: 'Reset again',
						onClick: () => navigate({ to: '/auth/forgot-password' }),
					},
				})
			} else if (msg.toLowerCase().includes('invalid')) {
				toast.error('Invalid code.', {
					description: 'Please check the code from your email.',
				})
			} else {
				toast.error(msg || 'Could not reset password. Please try again.')
			}
		},
	})

	if (success) {
		return (
			<AuthCard title="Password updated">
				<div className="space-y-6 text-center">
					<div className="flex flex-col items-center gap-3">
						<div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
							<CheckCircle2Icon className="size-8 text-green-600 dark:text-green-400" />
						</div>
						<div className="space-y-1">
							<p className="font-medium">Your password has been reset</p>
							<p className="text-sm text-muted-foreground">
								You can now sign in with your new password.
							</p>
						</div>
					</div>
					<Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
						<Link to="/auth/login">Sign in</Link>
					</Button>
				</div>
			</AuthCard>
		)
	}

	return (
		<AuthCard
			title="Choose a new password"
			description={
				userId
					? 'Enter the 6-digit code from your email and your new password.'
					: 'Enter your email, the code we sent you, and your new password.'
			}
			footer={
				<Link to="/auth/login" className="text-primary font-medium hover:underline">
					Back to sign in
				</Link>
			}
		>
			<form
				onSubmit={handleSubmit((v) =>
					mutation.mutate({ code: v.code, password: v.password }),
				)}
				className="space-y-4"
			>
				{!userId && (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
						Click the link from the reset email for a smoother experience, or enter the code manually below.
					</div>
				)}

				<Input
					label="Reset code"
					placeholder="6-digit code"
					inputMode="numeric"
					maxLength={6}
					className="text-center font-mono tracking-widest text-lg"
					error={errors.code?.message}
					{...register('code')}
				/>

				<PasswordInput
					label="New password"
					autoComplete="new-password"
					placeholder="Create a strong password"
					error={errors.password?.message}
					{...register('password')}
				/>

				<PasswordInput
					label="Confirm new password"
					autoComplete="new-password"
					placeholder="Repeat your password"
					error={errors.confirmPassword?.message}
					{...register('confirmPassword')}
				/>

				<Button
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					isLoading={mutation.isPending}
					loadingText="Updating..."
				>
					Update password
				</Button>
			</form>
		</AuthCard>
	)
}
