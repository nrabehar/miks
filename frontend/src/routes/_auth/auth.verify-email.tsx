import { AuthCard } from '#/components/auth/auth-card'
import { OtpForm } from '#/components/auth/otp-form'
import { Button } from '#/components/ui/button'
import { authApi } from '#/lib/api'
import { maskEmail } from '#/lib/utils/mask-email'
import { useAuthStore, isAuthenticated } from '#/stores/auth.store'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { MailIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/verify-email')({
	staticData: { title: 'Verify your email' },
	beforeLoad: () => {
		if (isAuthenticated(useAuthStore.getState())) {
			throw redirect({ to: '/' })
		}
	},
	component: VerifyEmailPage,
})

function VerifyEmailPage() {
	const { t } = useTranslation()
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
				toast.error(t('auth.verifyEmail.errors.expired'), {
					description: 'Please request a new code.',
				})
			} else {
				toast.error(t('auth.verifyEmail.errors.invalid'), {
					description: 'Please check the code and try again.',
				})
			}
		},
	})

	const resendMutation = useMutation({
		mutationFn: () => authApi.resendEmailCode(registrationId),
		onSuccess: () =>
			toast.success(t('auth.verifyEmail.resendSuccess'), {
				description: `Check your inbox at ${hiddenEmail || 'your email address'}.`,
			}),
		onError: () =>
			toast.error(t('auth.verifyEmail.resendFailure'), {
				description: 'Please wait a moment and try again.',
			}),
	})

	if (!registrationId) {
		return (
			<AuthCard
				title={t('auth.verifyEmail.title')}
				description={t('auth.verifyEmail.noSession')}
			>
				<div className="space-y-4 text-center">
					<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
						<MailIcon className="size-6 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">
						{t('auth.verifyEmail.noSessionHelp')}
					</p>
					<div className="flex flex-col gap-2">
						<Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
							<Link to="/auth/register">{t('auth.register.title')}</Link>
						</Button>
						<Button asChild variant="outline" size="lg" className="w-full">
							<Link to="/auth/login">{t('auth.login.title')}</Link>
						</Button>
					</div>
				</div>
			</AuthCard>
		)
	}

	return (
		<AuthCard
			title={t('auth.verifyEmail.title')}
			description={
				<span>
					{t('auth.verifyEmail.description', {
						email: hiddenEmail || 'your email address',
					})}
				</span>
			}
			footer={
				<>
					{t('auth.verifyEmail.wrongEmail')}{' '}
					<Link to="/auth/register" className="text-primary font-medium hover:underline">
						{t('auth.verifyEmail.startOver')}
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
						? t('auth.verifyEmail.errors.invalid')
						: undefined
				}
			/>
		</AuthCard>
	)
}