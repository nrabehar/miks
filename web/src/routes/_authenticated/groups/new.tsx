import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { z } from "zod"
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
import { useCreateGroup } from "#/features/groups/hooks"
import { createGroupSchema, CURRENCY_CODES } from "#/features/groups/schema"

export const Route = createFileRoute("/_authenticated/groups/new")({
	component: CreateGroupPage,
})

function CreateGroupPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const createGroup = useCreateGroup()

	const form = useForm({
		resolver: zodResolver(createGroupSchema),
		defaultValues: { name: "", description: "", currencyCode: "MGA" as const },
	})

	async function onSubmit(values: z.infer<typeof createGroupSchema>) {
		try {
			const group = await createGroup.mutateAsync(values)
			await navigate({ to: "/groups/$groupId", params: { groupId: group.id } })
		} catch {
			form.setError("root", { message: t("groups.create.genericError") })
		}
	}

	return (
		<div className="mx-auto max-w-md px-6 py-10">
			<Card>
				<CardHeader>
					<CardTitle>{t("groups.create.title")}</CardTitle>
				</CardHeader>
				<CardContent>
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
											<Input autoFocus {...field} />
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

							<Button type="submit" disabled={createGroup.isPending} className="w-full">
								{createGroup.isPending
									? t("groups.create.submitting")
									: t("groups.create.submit")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
