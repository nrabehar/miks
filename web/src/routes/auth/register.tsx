import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
import { z } from "zod"
import { MiksLogo } from "#/components/brand/logo"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Separator } from "#/components/ui/separator"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form"
import { OAuthButtons } from "#/features/auth/components/oauth-buttons"
import { useRegister } from "#/features/auth/hooks"
import { registerSchema } from "#/features/auth/schema"

const searchSchema = z.object({
	redirect: z.string().optional(),
})

export const Route = createFileRoute("/auth/register")({
	validateSearch: searchSchema,
	component: RegisterPage,
})

function RegisterPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { redirect } = Route.useSearch()
	const register = useRegister()

	const form = useForm({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			displayName: "",
		},
	})

	async function onSubmit(values: z.infer<typeof registerSchema>) {
		try {
			await register.mutateAsync(values)
			await navigate({ to: redirect ?? "/" })
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined
			const message =
				status === 409
					? t("auth.register.emailTaken")
					: t("auth.register.genericError")

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
							{t("auth.register.title")}
						</h1>
						<p className="text-muted-foreground text-sm">
							{t("auth.register.subtitle")}
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
								name="displayName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("auth.register.displayName")}</FormLabel>
										<FormControl>
											<Input autoComplete="name" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("auth.register.email")}</FormLabel>
										<FormControl>
											<Input
												type="email"
												autoComplete="email"
												placeholder={t("auth.register.emailPlaceholder")}
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
										<FormLabel>{t("auth.register.password")}</FormLabel>
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
											{t("auth.register.confirmPassword")}
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
								disabled={register.isPending}
								className="w-full"
							>
								{register.isPending
									? t("auth.register.submitting")
									: t("auth.register.submit")}
							</Button>
						</form>
					</Form>

					<div className="flex items-center gap-3">
						<Separator className="flex-1" />
						<span className="text-muted-foreground text-xs">
							{t("auth.register.orContinueWith")}
						</span>
						<Separator className="flex-1" />
					</div>

					<OAuthButtons />

					<p className="text-muted-foreground text-center text-sm">
						{t("auth.register.hasAccount")}{" "}
						<Link to="/auth/login" className="text-primary underline underline-offset-2">
							{t("auth.register.signIn")}
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}
