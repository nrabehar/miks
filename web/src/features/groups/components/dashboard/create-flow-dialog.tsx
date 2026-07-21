import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "#/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog"
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

import {
	coffreRecords,
	FLOW_SOURCE_LABEL,
	RETIRABLE_DESTINATION_ID,
	type FlowRuleRecord,
	type FlowSourceType,
} from "./mock-data"

const DESTINATION_OPTIONS = [
	...coffreRecords.map((coffre) => ({ value: coffre.id, label: coffre.name })),
	{ value: RETIRABLE_DESTINATION_ID, label: "Coffres rétirables des membres" },
]

const createFlowSchema = z
	.object({
		source: z.enum(["COTISATION", "PROJET", "MANUEL"]),
		destinations: z
			.array(
				z.object({
					coffreId: z.string().min(1, "Choisissez un coffre"),
					percentage: z.coerce.number().min(1, "Min. 1%").max(100, "Max. 100%"),
				}),
			)
			.min(1, "Ajoutez au moins une destination"),
	})
	.refine(
		(values) => values.destinations.reduce((sum, d) => sum + d.percentage, 0) === 100,
		{ message: "Le total des destinations doit être égal à 100%", path: ["destinations"] },
	)

interface CreateFlowDialogProps {
	onCreate: (rule: FlowRuleRecord) => void
}

export function CreateFlowDialog({ onCreate }: CreateFlowDialogProps) {
	const [open, setOpen] = useState(false)

	const form = useForm({
		resolver: zodResolver(createFlowSchema),
		defaultValues: {
			source: "COTISATION" as FlowSourceType,
			destinations: [{ coffreId: "", percentage: 100 }],
		},
	})

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "destinations",
	})

	const destinations = form.watch("destinations")
	const total = destinations.reduce((sum, d) => sum + (Number(d.percentage) || 0), 0)

	function onSubmit(values: z.infer<typeof createFlowSchema>) {
		onCreate({
			id: `flow-mock-${Date.now()}`,
			source: values.source as FlowSourceType,
			destinations: values.destinations,
			createdAt: new Date().toISOString(),
		})
		form.reset({ source: "COTISATION", destinations: [{ coffreId: "", percentage: 100 }] })
		setOpen(false)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				if (!next) {
					form.reset({ source: "COTISATION", destinations: [{ coffreId: "", percentage: 100 }] })
				}
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					<PlusIcon aria-hidden />
					Nouvelle règle de flux
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Configurer une règle de flux</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="source"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Source</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.entries(FLOW_SOURCE_LABEL).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Destinations</span>
								<span
									className={
										total === 100
											? "font-mono text-xs font-bold text-chart-4"
											: "font-mono text-xs font-bold text-destructive"
									}
								>
									{total}% / 100%
								</span>
							</div>

							{fields.map((fieldItem, index) => (
								<div key={fieldItem.id} className="flex items-start gap-2">
									<FormField
										control={form.control}
										name={`destinations.${index}.coffreId`}
										render={({ field }) => (
											<FormItem className="flex-1">
												<Select value={field.value} onValueChange={field.onChange}>
													<FormControl>
														<SelectTrigger className="w-full">
															<SelectValue placeholder="Choisir une destination" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{DESTINATION_OPTIONS.map((option) => (
															<SelectItem key={option.value} value={option.value}>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name={`destinations.${index}.percentage`}
										render={({ field }) => (
											<FormItem className="w-24">
												<FormControl>
													<Input
														type="number"
														min={1}
														max={100}
														name={field.name}
														disabled={field.disabled}
														ref={field.ref}
														value={field.value as number}
														onChange={(event) => field.onChange(event.target.valueAsNumber)}
														onBlur={field.onBlur}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										disabled={fields.length === 1}
										onClick={() => remove(index)}
										aria-label="Supprimer cette destination"
									>
										<Trash2Icon aria-hidden />
									</Button>
								</div>
							))}

							{(form.formState.errors.destinations?.message ??
								form.formState.errors.destinations?.root?.message) && (
								<p role="alert" className="text-destructive text-xs">
									{form.formState.errors.destinations?.message ??
										form.formState.errors.destinations?.root?.message}
								</p>
							)}

							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => append({ coffreId: "", percentage: 0 })}
							>
								<PlusIcon aria-hidden />
								Ajouter une destination
							</Button>
						</div>

						<DialogFooter>
							<Button type="submit">Créer la règle</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
