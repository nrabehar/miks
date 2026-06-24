import { AuthCard } from '#/components/auth/auth-card'
import { OtpForm } from '#/components/auth/otp-form'
import { Button } from '#/components/ui/button'
import { authApi } from '#/lib/api'
import { maskEmail } from '#/lib/utils/mask-email'
import { useAuthStore } from '#/stores/auth.store'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { MailIcon } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/verify-email')({
	beforeLoad: () => {
		if (useAuthStore.getState().status === 'authenticated') {
			throw redirect({ to: '/' })
		}
	},
	component: VerifyEmailPage,
})

function VerifyEmailPage() {
	const navigate = useNavigate()
	const registrationId = sessionStorage.getItem('miks_registration_id') ?? ''
	const email = sessionStorage.getItem('miks_registration_email') ?? ''
	const hiddenEmail = maskEmail(email)

	const submitMutation = useMutation({
		mutationFn: (code: string) => authApi.verifyEmail({ registrationId, code }),
		onSuccess: () => {
			sessionStorage.removeItem('miks_registration_id')
			sessionStorage.removeItem('miks_registration_email')
			toast.success('Email verified successfully!', {
				description: 'You can now sign in to your account.',
			})
			navigate({ to: '/auth/login', replace: true })
		},
		onError: (err: any) => {
			const msg = err.response?.data?.message ?? ''
			if (msg.toLowerCase().includes('expired')) {
				toast.error('Code expired.', { description: 'Please request a new code.' })
			} else {
				toast.error('Invalid verification code.', {
					description: 'Please check the code and try again.',
				})
			}
		},
	})

	const resendMutation = useMutation({
		mutationFn: () => authApi.resendEmailCode(registrationId),
		onSuccess: () =>
			toast.success('New code sent!', {
				description: `Check your inbox at ${hiddenEmail || 'your email address'}.`,
			}),
		onError: () =>
			toast.error('Could not resend the code.', {
				description: 'Please wait a moment and try again.',
			}),
	})

	if (!registrationId) {
		return (
			<AuthCard
				title="Verify your email"
				description="No verification session found."
			>
				<div className="space-y-4 text-center">
					<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
						<MailIcon className="size-6 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">
						Your verification session may have expired or you came here from a direct link.
					</p>
					<div className="flex flex-col gap-2">
						<Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
							<Link to="/auth/register">Create a new account</Link>
						</Button>
						<Button asChild variant="outline" size="lg" className="w-full">
							<Link to="/auth/login">Already verified? Sign in</Link>
						</Button>
					</div>
				</div>
			</AuthCard>
		)
	}

	return (
		<AuthCard
			title="Check your inbox"
			description={
				<span>
					We sent a 6-digit code to{' '}
					{hiddenEmail ? <strong className="text-foreground">{hiddenEmail}</strong> : 'your email address'}.
					{' '}Enter it below to verify your account.
				</span>
			}
			footer={
				<>
					Wrong email?{' '}
					<Link to="/auth/register" className="text-primary font-medium hover:underline">
						Start over
					</Link>
				</>
			}
		>
			<OtpForm
				onSubmit={(otp) => submitMutation.mutate(otp)}
				onResend={() => resendMutation.mutate()}
				submitting={submitMutation.isPending}
				resendCooldown={60}
				error={
					submitMutation.isError
						? 'Invalid or expired code. Please try again.'
						: undefined
				}
			/>
		</AuthCard>
	)
}

