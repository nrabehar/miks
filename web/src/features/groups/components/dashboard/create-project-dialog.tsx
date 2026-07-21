import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { Textarea } from "#/components/ui/textarea"

import { coffreRecords, type GroupProjectRecord } from "./mock-data"

const createProjectSchema = z.object({
	name: z.string().min(1, "Le titre est requis"),
	description: z.string().min(1, "La description est requise"),
	budget: z.coerce.number().positive("Le budget doit être supérieur à 0"),
	sourceCoffreId: z.string().min(1, "Choisissez un coffre source"),
})

interface CreateProjectDialogProps {
	onCreate: (project: GroupProjectRecord) => void
}

export function CreateProjectDialog({ onCreate }: CreateProjectDialogProps) {
	const [open, setOpen] = useState(false)

	const form = useForm({
		resolver: zodResolver(createProjectSchema),
		defaultValues: { name: "", description: "", budget: 0, sourceCoffreId: "" },
	})

	function onSubmit(values: z.infer<typeof createProjectSchema>) {
		onCreate({
			id: `prj-mock-${Date.now()}`,
			name: values.name,
			description: values.description,
			status: "EN_ATTENTE",
			sourceCoffreId: values.sourceCoffreId,
			budget: values.budget,
			gains: 0,
		})
		form.reset()
		setOpen(false)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				if (!next) form.reset()
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm">
					<PlusIcon aria-hidden />
					Nouveau projet
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Proposer un projet</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Titre</FormLabel>
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
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="budget"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Budget demandé (€)</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
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

						<FormField
							control={form.control}
							name="sourceCoffreId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Coffre source</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Choisir un coffre" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{coffreRecords.map((coffre) => (
												<SelectItem key={coffre.id} value={coffre.id}>
													{coffre.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit">Proposer le projet</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
