import { AuthCard } from '#/components/auth/auth-card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { SocialButton } from '#/components/ui/social-button'
import { authApi } from '#/lib/api'
import { loginSchema } from '#/lib/validation/auth.schema'
import { useAuthStore } from '#/stores/auth.store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/login')({
	beforeLoad: () => {
		if (useAuthStore.getState().status === 'authenticated') {
			throw redirect('/app')
		}
	},
	component: LoginPage,
})

function LoginPage() {
	const navigate = useNavigate()
	const setSession = useAuthStore((state) => state.setSession)
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: { identifier: '', password: '' },
	})

	const mutation = useMutation({
		mutationFn: authApi.login,
		onSuccess: (data) => {
			if (data.requires2FA) {
				navigate({
					to: '/auth/two-factor',
					search: { challengeId: data.challengeId },
				})
			} else {
				setSession(data)
			}
			toast.success('Logged in successfully!')
			navigate({ to: '/app', replace: true })
		},
		onError: (err: any) => {
			const errMsg =
				err.response?.data?.message ||
				'Login failed. Please check your credentials.'
			toast.error(errMsg)
		},
	})

	return (
		<AuthCard
			title="Log into your account"
			description="Get access to your account"
			footer={
				<>
					Don't have an account?{' '}
					<Link
						to="/auth/register"
						className="text-primary font-medium hover:underline"
					>
						Create one
					</Link>
				</>
			}
		>
			<form
				onSubmit={handleSubmit((v) => mutation.mutate(v))}
				className="space-y-4"
			>
				<div className="space-y-4">
					<Input
						label="Email address or mobile"
						autoComplete="email"
						placeholder="example@miks.mg"
						error={errors.identifier?.message}
						{...register('identifier')}
					/>
					<Input
						label={
							<>
								Password{' '}
								<Link
									to="/auth/forgot-password"
									className="text-primary font-medium hover:underline"
								>
									forgot?
								</Link>
							</>
						}
						type="password"
						autoComplete="current-password"
						placeholder="********"
						error={errors.password?.message}
						{...register('password')}
					/>
					<Button
						variant="secondary"
						type="submit"
						size="lg"
						className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
						loadingText="Logging in..."
					>
						Log In
					</Button>
				</div>
			</form>
			<div>
				<div className="flex items-center my-6">
					<div className="grow border-t border-muted"></div>
					<span className="mx-4 text-sm text-muted-foreground">
						OR
					</span>
					<div className="grow border-t border-muted"></div>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<SocialButton
					icon={<FcGoogle />}
					provider="Google"
					className="w-full"
				/>
				<SocialButton
					icon={<BsFacebook color="#1877F2" />}
					provider="Facebook"
					className="w-full"
				/>
			</div>
		</AuthCard>
	)
}
