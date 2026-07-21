import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

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
import { Textarea } from "#/components/ui/textarea"
import { findMockGroup } from "#/features/groups/mock-data"
import { CURRENCY_CODES, updateGroupSchema } from "#/features/groups/schema"
import type { Group } from "#/features/groups/schema"

export const Route = createFileRoute("/_authenticated/groups/$groupId/settings")({
	component: SettingsPage,
})

function SettingsPage() {
	const { groupId } = Route.useParams()
	const group = findMockGroup(groupId)

	if (!group) {
		return null
	}

	return <SettingsForm group={group} isClosed={group.status === "CLOSED"} />
}

function SettingsForm({ group, isClosed }: { group: Group; isClosed: boolean }) {
	const { t } = useTranslation()

	const form = useForm({
		resolver: zodResolver(updateGroupSchema),
		defaultValues: {
			name: group.name,
			description: group.description ?? "",
			currencyCode: group.currencyCode as (typeof CURRENCY_CODES)[number],
		},
	})

	// No backend yet: these simulate success locally instead of calling
	// useUpdateGroup/useLeaveGroup/useCloseGroup — swap back to the real
	// mutations once the API exists.
	function onSubmit() {
		toast.success(t("groups.overview.saved"))
	}

	function onLeave() {
		toast.success(t("groups.overview.left"))
	}

	function onClose() {
		toast.success(t("groups.overview.closed"))
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

								<Button type="submit">{t("groups.overview.save")}</Button>
							</form>
						</Form>

						<div className="border-border flex items-center justify-between border-t pt-6">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="outline">{t("groups.overview.leave")}</Button>
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
										<AlertDialogAction onClick={onLeave}>
											{t("groups.overview.leave")}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive">{t("groups.overview.close")}</Button>
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
										<AlertDialogAction onClick={onClose}>
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
