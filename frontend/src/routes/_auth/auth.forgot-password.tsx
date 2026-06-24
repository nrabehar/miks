import { AuthCard } from '#/components/auth/auth-card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { authApi } from '#/lib/api'
import { maskEmail } from '#/lib/utils/mask-email'
import { forgotPasswordSchema } from '#/lib/validation/auth.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { MailCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/forgot-password')({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const navigate = useNavigate()
	const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { email: '' },
	})

	const mutation = useMutation({
		mutationFn: (email: string) => authApi.forgotPassword(email),
		onSuccess: (_, email) => setSubmittedEmail(email),
		onError: () => toast.error('Something went wrong. Please try again.'),
	})

	if (submittedEmail) {
		const masked = maskEmail(submittedEmail)
		return (
			<AuthCard
				title="Check your inbox"
				footer={
					<Link to="/auth/login" className="text-primary font-medium hover:underline">
						Back to sign in
					</Link>
				}
			>
				<div className="space-y-6">
					<div className="flex flex-col items-center gap-4 text-center">
						<div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
							<MailCheckIcon className="size-8 text-primary" />
						</div>
						<div className="space-y-1.5">
							<p className="font-medium">Email sent to {masked}</p>
							<p className="text-sm text-muted-foreground">
								We sent a reset code to your email address.
								Click the link in the email or enter the code manually.
							</p>
						</div>
					</div>

					<Button
						size="lg"
						className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
						onClick={() =>
							navigate({
								to: '/auth/reset-password',
								search: { userId: '', token: '' },
							})
						}
					>
						Enter code manually
					</Button>

					<button
						type="button"
						className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
						onClick={() => {
							mutation.mutate(submittedEmail)
							toast.info('Sending another code...')
						}}
					>
						Didn't receive it? Send again
					</button>
				</div>
			</AuthCard>
		)
	}

	return (
		<AuthCard
			title="Reset your password"
			description="Enter your email address and we'll send you a reset code."
			footer={
				<Link to="/auth/login" className="text-primary font-medium hover:underline">
					Back to sign in
				</Link>
			}
		>
			<form
				onSubmit={handleSubmit((v) => mutation.mutate(v.email))}
				className="space-y-4"
			>
				<Input
					label="Email address"
					type="email"
					autoComplete="email"
					placeholder="example@miks.mg"
					error={errors.email?.message}
					{...register('email')}
				/>
				<Button
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					isLoading={mutation.isPending}
					loadingText="Sending..."
				>
					Send reset code
				</Button>
			</form>
		</AuthCard>
	)
}

