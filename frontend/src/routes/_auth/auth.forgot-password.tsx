import { AuthCard } from '#/components/auth/auth-card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { ResendButton } from '#/components/ui/resend-button'
import { authApi } from '#/lib/api'
import { maskEmail } from '#/lib/utils/mask-email'
import { forgotPasswordSchema } from '#/lib/validation/auth.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { MailCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/forgot-password')({
	staticData: { title: 'Reset your password' },
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const { t } = useTranslation()
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
		onError: () => toast.error(t('auth.forgotPassword.error')),
	})

	if (submittedEmail) {
		const masked = maskEmail(submittedEmail)
		return (
			<AuthCard
				title={t('auth.forgotPassword.sentTitle')}
				footer={
					<Link to="/auth/login" className="text-primary font-medium hover:underline">
						{t('auth.login.title')}
					</Link>
				}
			>
				<div className="space-y-6">
					<div className="flex flex-col items-center gap-4 text-center">
						<div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
							<MailCheckIcon className="size-8 text-primary" />
						</div>
						<div className="space-y-1.5">
							<p className="font-medium">
								{t('auth.forgotPassword.sentTo', { email: masked })}
							</p>
							<p className="text-sm text-muted-foreground">
								{t('auth.forgotPassword.sentHint')}
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
						{t('auth.forgotPassword.enterManually')}
					</Button>

					<ResendButton
						storageKey={`miks_forgot_resend_${submittedEmail}`}
						cooldownSeconds={60}
						label={t('auth.forgotPassword.resend')}
						cooldownLabel={t('auth.forgotPassword.resendCooldown')}
						disabled={mutation.isPending}
						onResend={async () => {
							mutation.mutate(submittedEmail)
							toast.info(t('auth.forgotPassword.sendAnother'))
						}}
					/>
				</div>
			</AuthCard>
		)
	}

	return (
		<AuthCard
			title={t('auth.forgotPassword.title')}
			description={t('auth.forgotPassword.description')}
			footer={
				<Link to="/auth/login" className="text-primary font-medium hover:underline">
					{t('common.back')}
				</Link>
			}
		>
			<form
				onSubmit={handleSubmit((v) => mutation.mutate(v.email))}
				className="space-y-4"
			>
				<Input
					label={t('auth.register.emailLabel')}
					type="email"
					autoComplete="email"
					placeholder={t('auth.register.emailPlaceholder')}
					error={errors.email?.message}
					{...register('email')}
				/>
				<Button
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					isLoading={mutation.isPending}
					loadingText={t('auth.forgotPassword.submitting')}
				>
					{t('auth.forgotPassword.submit')}
				</Button>
			</form>
		</AuthCard>
	)
}