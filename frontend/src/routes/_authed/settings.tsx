import { OtpForm } from '#/components/auth/otp-form'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#/components/ui/card'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { authApi } from '#/lib/api/auth.api'
import { useAuthStore } from '#/stores/auth.store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
	CheckCircle2Icon,
	CopyIcon,
	KeyRoundIcon,
	ShieldCheckIcon,
	ShieldOffIcon,
	UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_authed/settings')({
	staticData: { title: 'Paramètres' },
	component: SettingsPage,
})

function SettingsPage() {
	const { t } = useTranslation()

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="border-b border-border px-6 py-4">
				<h1 className="text-lg font-semibold">{t('settings.title')}</h1>
				<p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
			</div>

			<div className="mx-auto max-w-2xl space-y-6 p-6">
				<Tabs defaultValue="profile">
					<TabsList variant="line" className="mb-6">
						<TabsTrigger value="profile">
							<UserIcon className="size-3.5" />
							{t('settings.tabs.profile')}
						</TabsTrigger>
						<TabsTrigger value="security">
							<ShieldCheckIcon className="size-3.5" />
							{t('settings.tabs.security')}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="profile">
						<ProfileTab />
					</TabsContent>

					<TabsContent value="security">
						<SecurityTab />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}

/* ─── Profile Tab ──────────────────────────────────────────────── */

const profileSchema = z.object({
	firstName: z.string().min(1).max(80),
	lastName: z.string().max(80).optional(),
	phone: z
		.string()
		.regex(/^\+?\d{7,15}$/, 'Format invalide (ex: +261321234567)')
		.optional()
		.or(z.literal('')),
	language: z.enum(['fr', 'en', 'mg']),
})

type ProfileForm = z.infer<typeof profileSchema>

function ProfileTab() {
	const { t } = useTranslation()
	const user = useAuthStore((s) => s.user)
	const setUser = useAuthStore((s) => s.setUser)

	const {
		register,
		handleSubmit,
		formState: { errors, isDirty },
	} = useForm<ProfileForm>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			firstName: user?.firstName ?? '',
			lastName: user?.lastName ?? '',
			phone: user?.phone ?? '',
			language: (user?.language as 'fr' | 'en' | 'mg') ?? 'fr',
		},
	})

	const mutation = useMutation({
		mutationFn: authApi.updateProfile,
		onSuccess: (data) => {
			if (user) {
				setUser({ ...user, ...data })
			}
			toast.success(t('settings.profile.success'))
		},
		onError: () => toast.error(t('settings.profile.error')),
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t('settings.profile.title')}</CardTitle>
				<CardDescription>{t('settings.profile.description')}</CardDescription>
			</CardHeader>

			<form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="firstName">{t('settings.profile.firstName')}</Label>
							<Input
								id="firstName"
								{...register('firstName')}
								error={errors.firstName?.message}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="lastName">{t('settings.profile.lastName')}</Label>
							<Input
								id="lastName"
								{...register('lastName')}
								error={errors.lastName?.message}
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="email">{t('settings.profile.email')}</Label>
						<Input id="email" value={user?.email ?? ''} disabled className="opacity-60" />
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="phone">{t('settings.profile.phone')}</Label>
						<Input
							id="phone"
							type="tel"
							placeholder="+261321234567"
							{...register('phone')}
							error={errors.phone?.message}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="language">{t('settings.profile.language')}</Label>
						<select
							id="language"
							{...register('language')}
							className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							<option value="fr">Français</option>
							<option value="en">English</option>
							<option value="mg">Malagasy</option>
						</select>
					</div>
				</CardContent>

				<CardFooter className="justify-end">
					<Button
						type="submit"
						disabled={!isDirty || mutation.isPending}
						isLoading={mutation.isPending}
						loadingText={t('settings.profile.saving')}
					>
						{t('settings.profile.save')}
					</Button>
				</CardFooter>
			</form>
		</Card>
	)
}

/* ─── Security Tab ─────────────────────────────────────────────── */

function SecurityTab() {
	const { t } = useTranslation()
	const user = useAuthStore((s) => s.user)

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<KeyRoundIcon className="size-4" />
						{t('settings.security.twofa.title')}
					</CardTitle>
					<CardDescription>{t('settings.security.twofa.description')}</CardDescription>
				</CardHeader>

				<CardContent>
					<div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
						<div className="flex items-center gap-3">
							{user?.twoFaEnabled ? (
								<>
									<ShieldCheckIcon className="size-5 text-emerald-500" />
									<div>
										<p className="text-sm font-medium">{t('settings.security.twofa.enabled')}</p>
										<p className="text-xs text-muted-foreground">
											{t('settings.security.twofa.enabledHint')}
										</p>
									</div>
								</>
							) : (
								<>
									<ShieldOffIcon className="size-5 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">{t('settings.security.twofa.disabled')}</p>
										<p className="text-xs text-muted-foreground">
											{t('settings.security.twofa.disabledHint')}
										</p>
									</div>
								</>
							)}
						</div>

						{user?.twoFaEnabled ? <DisableTwoFADialog /> : <EnableTwoFADialog />}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

/* ─── Enable 2FA Dialog ────────────────────────────────────────── */

type SetupStep = 'scan' | 'verify' | 'done'

function EnableTwoFADialog() {
	const { t } = useTranslation()
	const user = useAuthStore((s) => s.user)
	const setUser = useAuthStore((s) => s.setUser)
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<SetupStep>('scan')
	const [setup, setSetup] = useState<{ otpAuthUrl: string; secret: string } | null>(null)
	const [copied, setCopied] = useState(false)

	const setupMutation = useMutation({
		mutationFn: authApi.setup2FA,
		onSuccess: (data) => {
			setSetup(data)
			setStep('scan')
		},
		onError: () => toast.error(t('settings.security.twofa.setupError')),
	})

	const enableMutation = useMutation({
		mutationFn: authApi.enable2FA,
		onSuccess: () => {
			if (user) setUser({ ...user, twoFaEnabled: true })
			setStep('done')
		},
		onError: () => toast.error(t('settings.security.twofa.invalidCode')),
	})

	const handleOpen = (v: boolean) => {
		setOpen(v)
		if (v) {
			setStep('scan')
			setSetup(null)
			setupMutation.mutate()
		}
	}

	const copySecret = () => {
		if (!setup?.secret) return
		navigator.clipboard.writeText(setup.secret)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpen}>
			<DialogTrigger asChild>
				<Button size="sm">{t('settings.security.twofa.enable')}</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-md" showCloseButton={step !== 'done'}>
				{step === 'scan' && (
					<>
						<DialogHeader>
							<DialogTitle>{t('settings.security.twofa.setup.scanTitle')}</DialogTitle>
							<DialogDescription>
								{t('settings.security.twofa.setup.scanDescription')}
							</DialogDescription>
						</DialogHeader>

						{setupMutation.isPending || !setup ? (
							<div className="flex h-48 items-center justify-center">
								<div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							</div>
						) : (
							<div className="space-y-4">
								<div className="flex justify-center rounded-xl border border-border bg-white p-4">
									<QRCode value={setup.otpAuthUrl} size={180} />
								</div>

								<div className="space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground">
										{t('settings.security.twofa.setup.manualKey')}
									</p>
									<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
										<code className="flex-1 break-all font-mono text-xs tracking-wider">
											{setup.secret}
										</code>
										<button
											type="button"
											onClick={copySecret}
											className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
											title={t('settings.security.twofa.setup.copyKey')}
										>
											{copied ? (
												<CheckCircle2Icon className="size-4 text-emerald-500" />
											) : (
												<CopyIcon className="size-4" />
											)}
										</button>
									</div>
								</div>

								<p className="text-xs text-muted-foreground">
									{t('settings.security.twofa.setup.apps')}
								</p>
							</div>
						)}

						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">{t('common.cancel')}</Button>
							</DialogClose>
							<Button onClick={() => setStep('verify')} disabled={!setup}>
								{t('common.continue')}
							</Button>
						</DialogFooter>
					</>
				)}

				{step === 'verify' && (
					<>
						<DialogHeader>
							<DialogTitle>{t('settings.security.twofa.setup.verifyTitle')}</DialogTitle>
							<DialogDescription>
								{t('settings.security.twofa.setup.verifyDescription')}
							</DialogDescription>
						</DialogHeader>

						<OtpForm
							onSubmit={(code) => enableMutation.mutate(code)}
							submitting={enableMutation.isPending}
							error={
								enableMutation.isError
									? t('settings.security.twofa.invalidCode')
									: undefined
							}
						/>

						<button
							type="button"
							className="text-left text-xs text-muted-foreground hover:underline underline-offset-4"
							onClick={() => setStep('scan')}
						>
							← {t('settings.security.twofa.setup.backToScan')}
						</button>
					</>
				)}

				{step === 'done' && (
					<div className="space-y-4 py-2 text-center">
						<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
							<ShieldCheckIcon className="size-7 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div className="space-y-1">
							<p className="font-semibold">{t('settings.security.twofa.setup.doneTitle')}</p>
							<p className="text-sm text-muted-foreground">
								{t('settings.security.twofa.setup.doneDescription')}
							</p>
						</div>
						<Button className="w-full" onClick={() => setOpen(false)}>
							{t('settings.security.twofa.setup.close')}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

/* ─── Disable 2FA Dialog ───────────────────────────────────────── */

function DisableTwoFADialog() {
	const { t } = useTranslation()
	const user = useAuthStore((s) => s.user)
	const setUser = useAuthStore((s) => s.setUser)
	const [open, setOpen] = useState(false)

	const disableMutation = useMutation({
		mutationFn: authApi.disable2FA,
		onSuccess: () => {
			if (user) setUser({ ...user, twoFaEnabled: false })
			setOpen(false)
			toast.success(t('settings.security.twofa.disableSuccess'))
		},
		onError: () => toast.error(t('settings.security.twofa.invalidCode')),
	})

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
					{t('settings.security.twofa.disable')}
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{t('settings.security.twofa.disableDialog.title')}</DialogTitle>
					<DialogDescription>
						{t('settings.security.twofa.disableDialog.description')}
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
					{t('settings.security.twofa.disableDialog.warning')}
				</div>

				<OtpForm
					onSubmit={(code) => disableMutation.mutate(code)}
					submitting={disableMutation.isPending}
					error={
						disableMutation.isError ? t('settings.security.twofa.invalidCode') : undefined
					}
				/>
			</DialogContent>
		</Dialog>
	)
}
