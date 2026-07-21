import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { z } from "zod"

import { Button } from "#/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "#/components/ui/form"
import { Input } from "#/components/ui/input"
import { InviteRow } from "#/features/groups/components/invite-row"
import { findMockGroup, findMockInvites } from "#/features/groups/mock-data"
import { inviteEmailSchema } from "#/features/groups/schema"
import type { GroupInvite } from "#/features/groups/schema"

export const Route = createFileRoute("/_authenticated/groups/$groupId/invites")({
	component: InvitesPage,
})

function InvitesPage() {
	const { t } = useTranslation()
	const { groupId } = Route.useParams()
	const group = findMockGroup(groupId)
	const isClosed = group?.status === "CLOSED"
	const [invites, setInvites] = useState<GroupInvite[]>(() => findMockInvites(groupId))
	const [sent, setSent] = useState(false)

	const form = useForm({
		resolver: zodResolver(inviteEmailSchema),
		defaultValues: { email: "" },
	})

	// No backend yet: simulate a successful invite locally instead of calling
	// useCreateInvite — swap back to the real mutation once the API exists.
	function onSubmit(values: z.infer<typeof inviteEmailSchema>) {
		setSent(false)
		const alreadyPending = invites.some(
			(invite) => invite.email === values.email && invite.status === "PENDING",
		)
		if (alreadyPending) {
			form.setError("root", { message: t("groups.invites.alreadyPendingOrMember") })
			return
		}

		setInvites((current) => [
			...current,
			{
				id: `inv-mock-${current.length + 1}`,
				groupId,
				email: values.email,
				status: "PENDING",
				invitedByMemberId: "mem-1",
				expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
				createdAt: new Date().toISOString(),
				acceptedAt: null,
			},
		])
		form.reset()
		setSent(true)
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
								<Button type="submit">{t("groups.invites.send")}</Button>
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
					{invites.length === 0 && (
						<p className="text-muted-foreground text-sm">{t("groups.invites.empty")}</p>
					)}
					{invites.map((invite) => (
						<InviteRow key={invite.id} groupId={groupId} invite={invite} />
					))}
				</CardContent>
			</Card>
		</div>
	)
}
