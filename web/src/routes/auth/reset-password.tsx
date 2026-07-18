import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
import { useState } from "react"
import { z } from "zod"
import { MiksLogo } from "#/components/brand/logo"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form"
import { useResetPassword } from "#/features/auth/hooks"
import { resetPasswordSchema } from "#/features/auth/schema"

const searchSchema = z.object({
	token: z.string().optional(),
})

export const Route = createFileRoute("/auth/reset-password")({
	validateSearch: searchSchema,
	component: ResetPasswordPage,
})

function ResetPasswordPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { token } = Route.useSearch()
	const resetPassword = useResetPassword()
	// A 400/409 means the token is expired or already used: the form is
	// never resubmitted against a token already known to be dead (spec
	// 0002-auth-flows AC-7).
	const [tokenDead, setTokenDead] = useState(false)
	const [done, setDone] = useState(false)

	const form = useForm({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { password: "", confirmPassword: "" },
	})

	async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
		if (!token) {
			setTokenDead(true)
			return
		}

		try {
			await resetPassword.mutateAsync({ token, password: values.password })
			setDone(true)
			await navigate({ to: "/auth/login" })
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined

			if (status === 400 || status === 409) {
				setTokenDead(true)
				return
			}

			form.setError("root", { message: t("auth.resetPassword.genericError") })
		}
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 sm:p-10">
			<div className="flex w-full max-w-sm flex-col gap-8">
				<div className="flex items-center gap-2">
					<MiksLogo className="h-8 w-8" />
					<span className="text-lg font-semibold">Miks</span>
				</div>

				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						{t("auth.resetPassword.title")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t("auth.resetPassword.subtitle")}
					</p>
				</div>

				{tokenDead || !token ? (
					<div className="flex flex-col gap-4">
						<p role="alert" className="text-destructive text-sm">
							{t("auth.resetPassword.tokenDead")}
						</p>
						<Button asChild>
							<Link to="/auth/forgot-password">
								{t("auth.resetPassword.requestNewLink")}
							</Link>
						</Button>
					</div>
				) : done ? (
					<p role="status" className="text-sm">
						{t("auth.resetPassword.success")}
					</p>
				) : (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							noValidate
							className="flex flex-col gap-5"
						>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("auth.resetPassword.password")}</FormLabel>
										<FormControl>
											<Input
												type="password"
												autoComplete="new-password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("auth.resetPassword.confirmPassword")}
										</FormLabel>
										<FormControl>
											<Input
												type="password"
												autoComplete="new-password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{form.formState.errors.root && (
								<p role="alert" className="text-destructive text-sm">
									{form.formState.errors.root.message}
								</p>
							)}

							<Button
								type="submit"
								disabled={resetPassword.isPending}
								className="w-full"
							>
								{resetPassword.isPending
									? t("auth.resetPassword.submitting")
									: t("auth.resetPassword.submit")}
							</Button>
						</form>
					</Form>
				)}
			</div>
		</div>
	)
}
