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
import { useTranslation } from 'react-i18next'
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
	const { t } = useTranslation()
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
			const raw = err.response?.data?.message
			const msg = Array.isArray(raw)
				? raw.join(', ')
				: typeof raw === 'string'
					? raw
					: ''
			if (msg.toLowerCase().includes('expired')) {
				toast.error(t('auth.resetPassword.errors.expired'), {
					description: 'Please request a new password reset.',
					action: {
						label: t('auth.forgotPassword.title'),
						onClick: () => navigate({ to: '/auth/forgot-password' }),
					},
				})
			} else if (msg.toLowerCase().includes('invalid')) {
				toast.error(t('auth.resetPassword.errors.invalid'), {
					description: 'Please check the code from your email.',
				})
			} else {
				toast.error(msg || t('auth.resetPassword.errors.generic'))
			}
		},
	})

	if (success) {
		return (
			<AuthCard title={t('auth.resetPassword.successTitle')}>
				<div className="space-y-6 text-center">
					<div className="flex flex-col items-center gap-3">
						<div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
							<CheckCircle2Icon className="size-8 text-green-600 dark:text-green-400" />
						</div>
						<div className="space-y-1">
							<p className="font-medium">{t('auth.resetPassword.successMessage')}</p>
							<p className="text-sm text-muted-foreground">
								{t('auth.resetPassword.successHelp')}
							</p>
						</div>
					</div>
					<Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
						<Link to="/auth/login">{t('auth.resetPassword.signIn')}</Link>
					</Button>
				</div>
			</AuthCard>
		)
	}

	return (
		<AuthCard
			title={t('auth.resetPassword.title')}
			description={userId ? t('auth.resetPassword.descriptionFromLink') : t('auth.resetPassword.description')}
			footer={
				<Link to="/auth/login" className="text-primary font-medium hover:underline">
					{t('common.back')}
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
						{t('auth.resetPassword.bannerHint')}
					</div>
				)}

				<Input
					label={t('auth.resetPassword.codeLabel')}
					placeholder={t('auth.resetPassword.codePlaceholder')}
					inputMode="numeric"
					maxLength={6}
					className="text-center font-mono tracking-widest text-lg"
					error={errors.code?.message}
					{...register('code')}
				/>

				<PasswordInput
					label={t('auth.resetPassword.newPasswordLabel')}
					autoComplete="new-password"
					placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
					error={errors.password?.message}
					{...register('password')}
				/>

				<PasswordInput
					label={t('auth.resetPassword.confirmLabel')}
					autoComplete="new-password"
					placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
					error={errors.confirmPassword?.message}
					{...register('confirmPassword')}
				/>

				<Button
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					isLoading={mutation.isPending}
					loadingText={t('auth.resetPassword.submitting')}
				>
					{t('auth.resetPassword.submit')}
				</Button>
			</form>
		</AuthCard>
	)
}