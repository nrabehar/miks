import { AuthCard } from '#/components/auth/auth-card'
import { OtpForm } from '#/components/auth/otp-form'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { PasswordInput } from '#/components/ui/password-input'
import { SocialButton } from '#/components/ui/social-button'
import { authApi } from '#/lib/api'
import { loginSchema } from '#/lib/validation/auth.schema'
import { useAuthStore, isAuthenticated } from '#/stores/auth.store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from '@tanstack/react-router'
import { AlertCircleIcon, ShieldCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/login')({
	staticData: { title: 'Sign in' },
	beforeLoad: () => {
		if (isAuthenticated(useAuthStore.getState())) {
			throw redirect({ to: '/' })
		}
	},
	component: LoginPage,
})

function LoginPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const setSession = useAuthStore((state) => state.setSession)
	const [emailNotVerified, setEmailNotVerified] = useState(false)
	const [challengeId, setChallengeId] = useState<string | null>(null)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: '', password: '' },
	})

	const loginMutation = useMutation({
		mutationFn: authApi.login,
		onSuccess: (data) => {
			setEmailNotVerified(false)
			if (data.requires2FA) {
				setChallengeId(data.challengeId)
				return
			}
			setSession({ user: data.user, accessToken: data.accessToken })
			toast.success('Welcome back!')
			navigate({ to: '/dashboard', replace: true })
		},
		onError: (err: any) => {
			const raw = err.response?.data?.message
			const msg: string = Array.isArray(raw) ? raw.join(', ') : (raw ?? '')
			if (msg.toLowerCase().includes('not verified') || msg.toLowerCase().includes('verify your email')) {
				setEmailNotVerified(true)
				return
			}
			toast.error(msg || t('auth.login.errors.invalidCredentials'))
		},
	})

	const twoFaMutation = useMutation({
		mutationFn: (code: string) =>
			authApi.verify2FALogin({ challengeId: challengeId!, code }),
		onSuccess: (data) => {
			setSession({ user: data.user, accessToken: data.accessToken })
			toast.success('Welcome back!')
			navigate({ to: '/dashboard', replace: true })
		},
		onError: () => {
			toast.error(t('auth.login.twoFactor.invalidCode'))
		},
	})

	// Step 2: 2FA verification
	if (challengeId) {
		return (
			<AuthCard
				title={t('auth.login.twoFactor.title')}
				description={t('auth.login.twoFactor.description')}
				footer={
					<button
						type="button"
						className="text-sm text-muted-foreground hover:underline underline-offset-4"
						onClick={() => setChallengeId(null)}
					>
						← {t('common.back')}
					</button>
				}
			>
				<div className="flex flex-col items-center gap-3 pb-2 text-center">
					<div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
						<ShieldCheckIcon className="size-7 text-primary" />
					</div>
					<p className="text-sm text-muted-foreground">
						{t('auth.login.twoFactor.description')}
					</p>
				</div>
				<OtpForm
					onSubmit={(otp) => twoFaMutation.mutate(otp)}
					submitting={twoFaMutation.isPending}
					error={
						twoFaMutation.isError
							? t('auth.login.twoFactor.invalidCode')
							: undefined
					}
				/>
			</AuthCard>
		)
	}

	// Step 1: email + password
	return (
		<AuthCard
			title={t('auth.login.title')}
			description={t('auth.login.description')}
			footer={
				<>
					{t('auth.login.noAccount')}{' '}
					<Link to="/auth/register" className="text-primary font-medium hover:underline">
						{t('auth.login.signUp')}
					</Link>
				</>
			}
		>
			{emailNotVerified && (
				<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
					<AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
					<div className="space-y-1">
						<p className="font-medium text-amber-800 dark:text-amber-300">
							{t('auth.login.errors.emailNotVerified')}
						</p>
						<p className="text-amber-700 dark:text-amber-400">
							Please check your inbox and enter the verification code.{' '}
							<Link
								to="/auth/verify-email"
								className="underline underline-offset-4 hover:no-underline"
							>
								Verify now →
							</Link>
						</p>
					</div>
				</div>
			)}

			<form
				onSubmit={handleSubmit((v) => loginMutation.mutate(v))}
				className="space-y-4"
			>
				<Input
					label={t('auth.login.identifierLabel')}
					autoComplete="email"
					placeholder={t('auth.login.identifierPlaceholder')}
					error={errors.email?.message}
					{...register('email')}
				/>
				<PasswordInput
					label={
						<span className="flex w-full items-center justify-between">
							<span>{t('auth.login.passwordLabel')}</span>
							<Link
								to="/auth/forgot-password"
								className="text-xs font-normal text-primary hover:underline"
								tabIndex={-1}
							>
								{t('auth.login.forgotPassword')}
							</Link>
						</span>
					}
					autoComplete="current-password"
					placeholder={t('auth.login.passwordPlaceholder')}
					error={errors.password?.message}
					{...register('password')}
				/>
				<Button
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					isLoading={loginMutation.isPending}
					loadingText={t('auth.login.submitting')}
				>
					{t('auth.login.submit')}
				</Button>
			</form>

			<div className="flex items-center gap-4">
				<div className="flex-1 border-t border-muted" />
				<span className="text-xs text-muted-foreground">{t('common.or')}</span>
				<div className="flex-1 border-t border-muted" />
			</div>

			<div className="grid grid-cols-2 gap-3">
				<SocialButton provider="google" icon={<FcGoogle className="size-5" />}>
					Google
				</SocialButton>
				<SocialButton provider="facebook" icon={<BsFacebook className="size-5 text-blue-600" />}>
					Facebook
				</SocialButton>
			</div>
		</AuthCard>
	)
}