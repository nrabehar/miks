import { createFileRoute, Link } from "@tanstack/react-router"
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
import { useCooldown } from "#/features/auth/use-cooldown"
import { useForgotPassword } from "#/features/auth/hooks"
import { forgotPasswordSchema } from "#/features/auth/schema"

export const Route = createFileRoute("/auth/forgot-password")({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const { t } = useTranslation()
	const forgotPassword = useForgotPassword()
	const cooldown = useCooldown()
	const [submitted, setSubmitted] = useState(false)

	const form = useForm({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { identifier: "" },
	})

	async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
		try {
			await forgotPassword.mutateAsync(values)
			// Always the same generic confirmation, whether or not the
			// identifier exists (spec 0002-auth-flows AC-5, matches the
			// backend's deliberate non-leaking response).
			setSubmitted(true)
		} catch (error) {
			if (isAxiosError(error) && error.response?.status === 429) {
				cooldown.start(60)
				form.setError("root", { message: t("auth.forgotPassword.rateLimited") })
				return
			}

			form.setError("root", { message: t("auth.forgotPassword.genericError") })
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
						{t("auth.forgotPassword.title")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t("auth.forgotPassword.subtitle")}
					</p>
				</div>

				{submitted ? (
					<p role="status" className="text-sm">
						{t("auth.forgotPassword.confirmation")}
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
								name="identifier"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("auth.forgotPassword.identifier")}</FormLabel>
										<FormControl>
											<Input
												type="email"
												autoComplete="username"
												placeholder={t("auth.login.identifierPlaceholder")}
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
								disabled={forgotPassword.isPending || cooldown.active}
								className="w-full"
							>
								{cooldown.active
									? t("auth.forgotPassword.cooldown", {
											seconds: cooldown.remaining,
										})
									: forgotPassword.isPending
										? t("auth.forgotPassword.submitting")
										: t("auth.forgotPassword.submit")}
							</Button>
						</form>
					</Form>
				)}

				<p className="text-muted-foreground text-center text-sm">
					<Link to="/auth/login" className="text-primary underline underline-offset-2">
						{t("auth.forgotPassword.backToLogin")}
					</Link>
				</p>
			</div>
		</div>
	)
}
