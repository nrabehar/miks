import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
import { z } from "zod"
import { MiksLogo } from "#/components/brand/logo"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "#/components/ui/input-otp"
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
import {
	useConfirmDevice,
	useLogin,
	useResendDeviceConfirmation,
} from "#/features/auth/hooks"
import {
	OAUTH_CHANNEL_NAME,
	OAUTH_POPUP_WINDOW_NAME,
	OAUTH_SUCCESS_MESSAGE,
} from "#/features/auth/oauth-callback-message"
import { confirmDeviceSchema, loginSchema } from "#/features/auth/schema"
import { useCooldown } from "#/features/auth/use-cooldown"

const searchSchema = z.object({
	redirect: z.string().optional(),
	// Set when we land here from the OAuth callback (google/facebook) because
	// the device wasn't recognized yet (spec 0001-authentication's
	// 2026-07-18 addendum, AC-15); reuses the same confirmation step as a
	// direct login.
	confirmationId: z.string().optional(),
})

export const Route = createFileRoute("/auth/login")({
	validateSearch: searchSchema,
	component: LoginPage,
})

function LoginPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { redirect, confirmationId: searchConfirmationId } = Route.useSearch()
	const login = useLogin()
	const [confirmationId, setConfirmationId] = useState<string | null>(
		searchConfirmationId ?? null,
	)

	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: { identifier: "", password: "" },
	})

	async function onSubmit(values: z.infer<typeof loginSchema>) {
		try {
			const result = await login.mutateAsync(values)

			if (result.status === "confirmation-required") {
				setConfirmationId(result.confirmationId)
				return
			}

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

	if (confirmationId) {
		return (
			<div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 sm:p-10">
				<div className="flex w-full max-w-sm flex-col gap-8">
					<div className="flex items-center gap-2">
						<MiksLogo className="h-8 w-8" />
						<span className="text-lg font-semibold">Miks</span>
					</div>
					<DeviceConfirmationForm
						confirmationId={confirmationId}
						onConfirmed={() => {
							// window.name (set when oauth-buttons.tsx opened this popup),
							// not window.opener: the OAuth provider's own page's
							// Cross-Origin-Opener-Policy header permanently severs
							// window.opener once the popup navigates there.
							if (window.name === OAUTH_POPUP_WINDOW_NAME) {
								const channel = new BroadcastChannel(OAUTH_CHANNEL_NAME)
								channel.postMessage(OAUTH_SUCCESS_MESSAGE)
								channel.close()
								window.close()
								return
							}

							void navigate({ to: redirect ?? "/" })
						}}
					/>
				</div>
			</div>
		)
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

							<div className="flex justify-end">
								<Link
									to="/auth/forgot-password"
									className="text-muted-foreground text-sm underline underline-offset-2"
								>
									{t("auth.login.forgotPassword")}
								</Link>
							</div>

							<Button type="submit" disabled={login.isPending} className="w-full">
								{login.isPending
									? t("auth.login.submitting")
									: t("auth.login.submit")}
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
						{t("auth.login.noAccount")}{" "}
						<Link
							to="/auth/register"
							className="text-primary underline underline-offset-2"
						>
							{t("auth.login.signUp")}
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}

function DeviceConfirmationForm({
	confirmationId,
	onConfirmed,
}: {
	confirmationId: string
	onConfirmed: () => void
}) {
	const { t } = useTranslation()
	const confirmDevice = useConfirmDevice()
	const resend = useResendDeviceConfirmation()
	const cooldown = useCooldown()
	const [resent, setResent] = useState(false)

	const form = useForm({
		resolver: zodResolver(confirmDeviceSchema),
		defaultValues: { code: "" },
	})

	async function onSubmit(values: z.infer<typeof confirmDeviceSchema>) {
		try {
			await confirmDevice.mutateAsync({ confirmationId, code: values.code })
			onConfirmed()
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined
			const message =
				status === 400
					? t("auth.deviceConfirmation.expiredCode")
					: status === 409
						? t("auth.deviceConfirmation.alreadyUsed")
						: t("auth.deviceConfirmation.genericError")

			form.setError("root", { message })
		}
	}

	async function onResend() {
		try {
			await resend.mutateAsync(confirmationId)
			setResent(true)
		} catch (error) {
			if (isAxiosError(error) && error.response?.status === 429) {
				cooldown.start(60)
				form.setError("root", {
					message: t("auth.deviceConfirmation.rateLimited"),
				})
				return
			}

			form.setError("root", {
				message: t("auth.deviceConfirmation.genericError"),
			})
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					{t("auth.deviceConfirmation.title")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("auth.deviceConfirmation.subtitle")}
				</p>
				<p className="text-muted-foreground text-xs">
					{t("auth.deviceConfirmation.expiresHint")}
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
						name="code"
						render={({ field }) => (
							<FormItem className="items-center">
								<FormLabel className="sr-only">
									{t("auth.deviceConfirmation.code")}
								</FormLabel>
								<FormControl>
									<InputOTP
										maxLength={6}
										autoFocus
										inputMode="numeric"
										value={field.value}
										onChange={field.onChange}
										onComplete={() => form.handleSubmit(onSubmit)()}
										disabled={confirmDevice.isPending}
									>
										<InputOTPGroup>
											{Array.from({ length: 6 }, (_, i) => (
												<InputOTPSlot key={i} index={i} />
											))}
										</InputOTPGroup>
									</InputOTP>
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

					{resent && (
						<p role="status" className="text-sm">
							{t("auth.deviceConfirmation.resendSent")}
						</p>
					)}

					<Button
						type="submit"
						disabled={confirmDevice.isPending}
						className="w-full"
					>
						{confirmDevice.isPending
							? t("auth.deviceConfirmation.submitting")
							: t("auth.deviceConfirmation.submit")}
					</Button>

					<Button
						type="button"
						variant="ghost"
						disabled={resend.isPending || cooldown.active}
						onClick={onResend}
					>
						{cooldown.active
							? t("auth.deviceConfirmation.cooldown", {
									seconds: cooldown.remaining,
								})
							: t("auth.deviceConfirmation.resend")}
					</Button>
				</form>
			</Form>

			<Link
				to="/auth/login"
				className="text-muted-foreground text-center text-sm underline underline-offset-2"
			>
				{t("auth.deviceConfirmation.backToLogin")}
			</Link>
		</div>
	)
}
