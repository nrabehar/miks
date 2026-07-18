import { createFileRoute, Link } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
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
import { authKeys } from "#/features/auth/queries"
import { useResendVerification, useVerifyEmail } from "#/features/auth/hooks"
import { useCooldown } from "#/features/auth/use-cooldown"

const searchSchema = z.object({
	token: z.string().optional(),
})

const resendSchema = z.object({
	identifier: z.email("Entrez une adresse e-mail valide"),
})

export const Route = createFileRoute("/auth/verify-email")({
	validateSearch: searchSchema,
	component: VerifyEmailPage,
})

type Status = "pending" | "success" | "error"

function VerifyEmailPage() {
	const { t } = useTranslation()
	const { token } = Route.useSearch()
	const queryClient = useQueryClient()
	const verifyEmail = useVerifyEmail()
	const [status, setStatus] = useState<Status>(token ? "pending" : "error")

	useEffect(() => {
		if (!token) return

		verifyEmail.mutate(token, {
			onSuccess: () => {
				setStatus("success")
				void queryClient.invalidateQueries({ queryKey: authKeys.me() })
			},
			onError: () => setStatus("error"),
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token])

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 sm:p-10">
			<div className="flex w-full max-w-sm flex-col gap-8">
				<div className="flex items-center gap-2">
					<MiksLogo className="h-8 w-8" />
					<span className="text-lg font-semibold">Miks</span>
				</div>

				{status === "pending" && (
					<p role="status" className="text-muted-foreground text-sm">
						{t("auth.verifyEmail.pending")}
					</p>
				)}

				{status === "success" && (
					<div className="flex flex-col gap-4">
						<p role="status" className="text-sm">
							{t("auth.verifyEmail.success")}
						</p>
						<Button asChild>
							<Link to="/">{t("auth.verifyEmail.continue")}</Link>
						</Button>
					</div>
				)}

				{status === "error" && <ResendForm />}
			</div>
		</div>
	)
}

function ResendForm() {
	const { t } = useTranslation()
	const resend = useResendVerification()
	const cooldown = useCooldown()
	const [sent, setSent] = useState(false)

	const form = useForm({
		resolver: zodResolver(resendSchema),
		defaultValues: { identifier: "" },
	})

	async function onSubmit(values: z.infer<typeof resendSchema>) {
		try {
			await resend.mutateAsync(values.identifier)
			setSent(true)
		} catch (error) {
			if (isAxiosError(error) && error.response?.status === 429) {
				cooldown.start(60)
				form.setError("root", { message: t("auth.verifyEmail.rateLimited") })
				return
			}

			form.setError("root", { message: t("auth.verifyEmail.genericError") })
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<p role="alert" className="text-destructive text-sm">
				{t("auth.verifyEmail.tokenDead")}
			</p>

			{sent ? (
				<p role="status" className="text-sm">
					{t("auth.verifyEmail.resendSent")}
				</p>
			) : (
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						noValidate
						className="flex flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="identifier"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("auth.verifyEmail.identifier")}</FormLabel>
									<FormControl>
										<Input type="email" autoComplete="username" {...field} />
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
							disabled={resend.isPending || cooldown.active}
							className="w-full"
						>
							{cooldown.active
								? t("auth.verifyEmail.cooldown", {
										seconds: cooldown.remaining,
									})
								: t("auth.verifyEmail.resend")}
						</Button>
					</form>
				</Form>
			)}
		</div>
	)
}
