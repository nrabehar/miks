import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { SocialButton } from '#/components/ui/social-button'
import {
	registerSchema,
	type RegisterFormData,
} from '#/lib/validation/auth.schema'
import { useAuthStore } from '#/stores/auth.store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'


export const RegisterForm = () => {
	const registerAccount = useAuthStore((s) => s.register)
	const [error, setError] = useState<string | null>(null)
	const navigate = useNavigate()
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
		defaultValues: { firstName: '', lastName: '', email: '', password: '' },
	})

	const mutation = useMutation({
		mutationFn: async (data: RegisterFormData) => {
			setError(null)
			await registerAccount(data)
		},
		onSuccess: () => {
			const from = '/'
			navigate({ to: from, replace: true })
		},
		onError: (err: any) => {
			const errMsg =
				err.response?.data?.message ||
				'Registration failed. Please check your input.'
			setError(errMsg)
		},
	})
	const onSubmit = (data: RegisterFormData) => {
		mutation.mutate(data)
	}
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25 }}
		>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<Input
						label="First Name"
						type="text"
						placeholder="John"
						error={errors.firstName?.message}
						{...register('firstName')}
						className="w-full h-12"
					/>

					<Input
						label="Last Name"
						type="text"
						placeholder="Doe"
						error={errors.lastName?.message}
						{...register('lastName')}
						className="w-full h-12"
					/>
				</div>

				<Input
					label="Email"
					type="email"
					placeholder="example@miks.mg"
					error={errors.email?.message}
					{...register('email')}
					className="w-full h-12"
				/>

				<Input
					label="Password"
					type="password"
					placeholder="Your password"
					error={errors.password?.message}
					{...register('password')}
					className="w-full h-12"
					helperText='Must have a higher case, lower and number.'
				/>

				{error && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					>
						{error}
					</motion.div>
				)}

				<Button
					variant="secondary"
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
					isLoading={mutation.isPending}
				>
					Sign Up
				</Button>
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
		</motion.div>
	)
}
