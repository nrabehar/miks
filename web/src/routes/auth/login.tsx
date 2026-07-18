import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
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
import { useLogin } from "#/features/auth/hooks"
import { loginSchema } from "#/features/auth/schema"

const searchSchema = z.object({
	redirect: z.string().optional(),
})

export const Route = createFileRoute("/auth/login")({
	validateSearch: searchSchema,
	component: LoginPage,
})

function LoginPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { redirect } = Route.useSearch()
	const login = useLogin()

	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: { identifier: "", password: "" },
	})

	async function onSubmit(values: z.infer<typeof loginSchema>) {
		try {
			await login.mutateAsync(values)
			await navigate({ to: redirect ?? "/" })
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined
			const message =
				status === 423
					? t("auth.login.locked")
					: status === 401
						? t("auth.login.invalidCredentials")
						: t("auth.login.genericError")

			form.setError("root", { message })
		}
	}

	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
				<div
					aria-hidden="true"
					className="animate-blob-pulse absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl"
				/>
				<div
					aria-hidden="true"
					className="animate-blob-up absolute right-0 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl"
				/>
				<div className="relative flex items-center gap-2">
					<MiksLogo className="h-9 w-9" />
					<span className="text-lg font-semibold">Miks</span>
				</div>
				<blockquote className="relative space-y-2">
					<p className="text-2xl leading-snug font-medium text-balance">
						Épargnez, décidez et suivez chaque contribution ensemble, en toute
						transparence.
					</p>
				</blockquote>
			</div>

			<div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
				<div className="flex w-full max-w-sm flex-col gap-8">
					<div className="flex items-center gap-2 lg:hidden">
						<MiksLogo className="h-8 w-8" />
						<span className="text-lg font-semibold">Miks</span>
					</div>

					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold tracking-tight">
							{t("auth.login.title")}
						</h1>
						<p className="text-muted-foreground text-sm">
							{t("auth.login.subtitle")}
						</p>
					</div>

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
										<FormLabel>{t("auth.login.identifier")}</FormLabel>
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

							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("auth.login.password")}</FormLabel>
										<FormControl>
											<Input
												type="password"
												autoComplete="current-password"
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

							<Button type="submit" disabled={login.isPending} className="w-full">
								{login.isPending
									? t("auth.login.submitting")
									: t("auth.login.submit")}
							</Button>
						</form>
					</Form>
				</div>
			</div>
		</div>
	)
}
