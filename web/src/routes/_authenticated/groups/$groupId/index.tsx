import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
import { toast } from "sonner"
import type { z } from "zod"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form"
import { Input } from "#/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select"
import { Skeleton } from "#/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs"
import { Textarea } from "#/components/ui/textarea"
import { InviteRow } from "#/features/groups/components/invite-row"
import { MemberRow } from "#/features/groups/components/member-row"
import {
	useCloseGroup,
	useCreateInvite,
	useGroup,
	useInvites,
	useLeaveGroup,
	useMembers,
	useUpdateGroup,
} from "#/features/groups/hooks"
import {
	CURRENCY_CODES,
	inviteEmailSchema,
	updateGroupSchema,
} from "#/features/groups/schema"

const MEMBERS_PAGE_SIZE = 50
const INVITES_PAGE_SIZE = 20

export const Route = createFileRoute("/_authenticated/groups/$groupId/")({
	component: GroupDetailPage,
})

function GroupDetailPage() {
	const { t } = useTranslation()
	const { groupId } = Route.useParams()
	const { data: group, isPending } = useGroup(groupId)

	if (isPending || !group) {
		return (
			<div className="mx-auto max-w-3xl px-6 py-10">
				<Skeleton className="h-40 w-full" />
			</div>
		)
	}

	const isClosed = group.status === "CLOSED"

	return (
		<div className="mx-auto max-w-3xl px-6 py-10">
			<div className="mb-6 flex items-center gap-3">
				<h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
				{isClosed && <Badge variant="secondary">{t("groups.status.closed")}</Badge>}
			</div>

			<Tabs defaultValue="overview">
				<TabsList>
					<TabsTrigger value="overview">{t("groups.detail.overviewTab")}</TabsTrigger>
					<TabsTrigger value="members">{t("groups.detail.membersTab")}</TabsTrigger>
					<TabsTrigger value="invites">{t("groups.detail.invitesTab")}</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-4">
					<OverviewTab groupId={groupId} group={group} isClosed={isClosed} />
				</TabsContent>

				<TabsContent value="members" className="mt-4">
					<MembersTab groupId={groupId} />
				</TabsContent>

				<TabsContent value="invites" className="mt-4">
					<InvitesTab groupId={groupId} isClosed={isClosed} />
				</TabsContent>
			</Tabs>
		</div>
	)
}

function OverviewTab({
	groupId,
	group,
	isClosed,
}: {
	groupId: string
	group: ReturnType<typeof useGroup>["data"] & object
	isClosed: boolean
}) {
	const { t } = useTranslation()
	const updateGroup = useUpdateGroup(groupId)
	const leaveGroup = useLeaveGroup(groupId)
	const closeGroup = useCloseGroup(groupId)

	const form = useForm({
		resolver: zodResolver(updateGroupSchema),
		defaultValues: {
			name: group.name,
			description: group.description ?? "",
			currencyCode: group.currencyCode as (typeof CURRENCY_CODES)[number],
		},
	})

	async function onSubmit(values: z.infer<typeof updateGroupSchema>) {
		try {
			await updateGroup.mutateAsync(values)
			toast.success(t("groups.overview.saved"))
		} catch {
			form.setError("root", { message: t("groups.overview.genericError") })
		}
	}

	// The backend's active membership guard is the sole source of truth for
	// leave/close eligibility (spec 0003-group-membership-ui's Security
	// model): the frontend never pre-computes "am I the last active member",
	// it just reflects the 409 the API returns.
	async function onLeave() {
		try {
			await leaveGroup.mutateAsync()
			toast.success(t("groups.overview.left"))
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined
			toast.error(
				status === 409
					? t("groups.overview.leaveLastMember")
					: t("groups.overview.genericError"),
			)
		}
	}

	async function onClose() {
		try {
			await closeGroup.mutateAsync()
			toast.success(t("groups.overview.closed"))
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined
			toast.error(
				status === 409
					? t("groups.overview.closeNotLastMember")
					: t("groups.overview.genericError"),
			)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("groups.overview.title")}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				{isClosed ? (
					<div className="flex flex-col gap-2 text-sm">
						<div>
							<span className="text-muted-foreground">{t("groups.create.name")}: </span>
							{group.name}
						</div>
						{group.description && (
							<div>
								<span className="text-muted-foreground">
									{t("groups.create.description")}:{" "}
								</span>
								{group.description}
							</div>
						)}
						<div>
							<span className="text-muted-foreground">
								{t("groups.create.currency")}:{" "}
							</span>
							{group.currencyCode}
						</div>
						<p className="text-muted-foreground pt-2">{t("groups.overview.closedNotice")}</p>
					</div>
				) : (
					<>
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								noValidate
								className="flex flex-col gap-5"
							>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("groups.create.name")}</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("groups.create.description")}</FormLabel>
											<FormControl>
												<Textarea {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="currencyCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("groups.create.currency")}</FormLabel>
											<Select value={field.value} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{CURRENCY_CODES.map((code) => (
														<SelectItem key={code} value={code}>
															{code}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								{form.formState.errors.root && (
									<p role="alert" className="text-destructive text-sm">
										{form.formState.errors.root.message}
									</p>
								)}

								<Button type="submit" disabled={updateGroup.isPending}>
									{updateGroup.isPending
										? t("groups.overview.saving")
										: t("groups.overview.save")}
								</Button>
							</form>
						</Form>

						<div className="border-border flex items-center justify-between border-t pt-6">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="outline" disabled={leaveGroup.isPending}>
										{t("groups.overview.leave")}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>{t("groups.overview.leaveConfirmTitle")}</AlertDialogTitle>
										<AlertDialogDescription>
											{t("groups.overview.leaveConfirmDescription")}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>{t("groups.invites.cancel")}</AlertDialogCancel>
										<AlertDialogAction onClick={() => void onLeave()}>
											{t("groups.overview.leave")}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" disabled={closeGroup.isPending}>
										{t("groups.overview.close")}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>{t("groups.overview.closeConfirmTitle")}</AlertDialogTitle>
										<AlertDialogDescription>
											{t("groups.overview.closeConfirmDescription")}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>{t("groups.invites.cancel")}</AlertDialogCancel>
										<AlertDialogAction onClick={() => void onClose()}>
											{t("groups.overview.close")}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

function MembersTab({ groupId }: { groupId: string }) {
	const { t } = useTranslation()
	const { data, isPending } = useMembers(groupId, {
		page: 1,
		limit: MEMBERS_PAGE_SIZE,
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("groups.members.title")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPending && (
					<>
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</>
				)}

				{!isPending && data?.data.length === 0 && (
					<p className="text-muted-foreground text-sm">{t("groups.members.empty")}</p>
				)}

				{data?.data.map((member) => <MemberRow key={member.id} member={member} />)}
			</CardContent>
		</Card>
	)
}

function InvitesTab({ groupId, isClosed }: { groupId: string; isClosed: boolean }) {
	const { t } = useTranslation()
	const { data, isPending } = useInvites(groupId, {
		page: 1,
		limit: INVITES_PAGE_SIZE,
	})
	const createInvite = useCreateInvite(groupId)
	const [sent, setSent] = useState(false)

	const form = useForm({
		resolver: zodResolver(inviteEmailSchema),
		defaultValues: { email: "" },
	})

	async function onSubmit(values: z.infer<typeof inviteEmailSchema>) {
		setSent(false)
		try {
			await createInvite.mutateAsync(values.email)
			form.reset()
			setSent(true)
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined
			const message =
				status === 409
					? t("groups.invites.alreadyPendingOrMember")
					: t("groups.invites.genericError")
			form.setError("root", { message })
		}
	}

	return (
		<div className="flex flex-col gap-6">
			{!isClosed && (
				<Card>
					<CardHeader>
						<CardTitle>{t("groups.invites.inviteTitle")}</CardTitle>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								noValidate
								className="flex items-start gap-3"
							>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormControl>
												<Input
													type="email"
													placeholder={t("groups.invites.emailPlaceholder")}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type="submit" disabled={createInvite.isPending}>
									{createInvite.isPending
										? t("groups.invites.sending")
										: t("groups.invites.send")}
								</Button>
							</form>
						</Form>
						{form.formState.errors.root && (
							<p role="alert" className="text-destructive mt-2 text-sm">
								{form.formState.errors.root.message}
							</p>
						)}
						{sent && (
							<p role="status" className="text-muted-foreground mt-2 text-sm">
								{t("groups.invites.sent")}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>{t("groups.invites.pendingTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{isPending && <Skeleton className="h-16 w-full" />}
					{!isPending && data?.data.length === 0 && (
						<p className="text-muted-foreground text-sm">{t("groups.invites.empty")}</p>
					)}
					{data?.data.map((invite) => (
						<InviteRow key={invite.id} groupId={groupId} invite={invite} />
					))}
				</CardContent>
			</Card>
		</div>
	)
}
