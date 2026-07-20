import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { z } from "zod"
import { Badge } from "#/components/ui/badge"
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
import { useMe } from "#/features/auth/hooks"
import { useProposeRemovalVote, useRespondToVote } from "#/features/groups/hooks"
import { proposeRemovalVoteFormSchema } from "#/features/groups/schema"
import type { GroupMember, RemovalVoteWithTally } from "#/features/groups/schema"

const APPROVAL_THRESHOLD_FLOOR = 50

export function MemberRow({
	groupId,
	member,
	isClosed,
	openVote,
	myMemberId,
	canPropose,
	minQuorum,
}: {
	groupId: string
	member: GroupMember
	isClosed: boolean
	openVote?: RemovalVoteWithTally
	myMemberId?: string
	canPropose: boolean
	minQuorum: number
}) {
	const { t } = useTranslation()
	const { data: me } = useMe()
	const isMe = member.userId === me?.id
	const isTarget = openVote?.targetMemberId === member.id

	return (
		<div className="border-border flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">
							{isMe ? me.displayName : t("groups.members.unknownMember", { id: member.userId.slice(0, 8) })}
						</span>
						{isMe && <Badge variant="secondary">{t("groups.members.you")}</Badge>}
						{member.status === "LEFT" && (
							<Badge variant="outline">{t("groups.members.left")}</Badge>
						)}
					</div>
					<span className="text-muted-foreground text-xs">
						{member.status === "ACTIVE"
							? t("groups.members.joinedAt", {
									date: new Date(member.joinedAt).toLocaleDateString(),
								})
							: t("groups.members.leftAt", {
									date: member.leftAt
										? new Date(member.leftAt).toLocaleDateString()
										: "",
								})}
					</span>
				</div>

				{!isClosed && !isMe && member.status === "ACTIVE" && !isTarget && (
					<ProposeRemovalVoteButton
						groupId={groupId}
						member={member}
						canPropose={canPropose}
						minQuorum={minQuorum}
					/>
				)}
			</div>

			{isTarget && openVote && (
				<RemovalVoteTally
					groupId={groupId}
					vote={openVote}
					isTarget={isMe}
					myMemberId={myMemberId}
				/>
			)}
		</div>
	)
}

function ProposeRemovalVoteButton({
	groupId,
	member,
	canPropose,
	minQuorum,
}: {
	groupId: string
	member: GroupMember
	canPropose: boolean
	minQuorum: number
}) {
	const { t } = useTranslation()
	const propose = useProposeRemovalVote(groupId)

	const form = useForm({
		resolver: zodResolver(proposeRemovalVoteFormSchema),
		defaultValues: { durationHours: 72 },
	})

	async function onSubmit(values: z.infer<typeof proposeRemovalVoteFormSchema>) {
		try {
			await propose.mutateAsync({
				memberId: member.id,
				input: {
					approvalThreshold: APPROVAL_THRESHOLD_FLOOR,
					minQuorum,
					durationHours: values.durationHours,
				},
			})
			toast.success(t("groups.members.voteProposed"))
			form.reset()
		} catch (error) {
			const status = isAxiosError(error) ? error.response?.status : undefined
			const message =
				status === 409
					? t("groups.members.voteAlreadyOpen")
					: t("groups.members.voteProposeError")
			form.setError("root", { message })
		}
	}

	if (!canPropose) {
		return (
			<div className="flex flex-col items-end gap-1">
				<Button variant="outline" size="sm" disabled>
					{t("groups.members.proposeVote")}
				</Button>
				<span className="text-muted-foreground text-xs">
					{t("groups.members.tooFewMembers")}
				</span>
			</div>
		)
	}

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) form.reset()
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					{t("groups.members.proposeVote")}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("groups.members.proposeVoteTitle")}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
						<p className="text-muted-foreground text-sm">
							{t("groups.members.proposeVoteDescription")}
						</p>
						<FormField
							control={form.control}
							name="durationHours"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("groups.members.durationHours")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
											name={field.name}
											disabled={field.disabled}
											ref={field.ref}
											value={field.value as number}
											onChange={(e) => field.onChange(e.target.valueAsNumber)}
											onBlur={field.onBlur}
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
						<DialogFooter>
							<Button type="submit" disabled={propose.isPending}>
								{propose.isPending
									? t("groups.members.proposing")
									: t("groups.members.proposeVote")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}

function RemovalVoteTally({
	groupId,
	vote,
	isTarget,
	myMemberId,
}: {
	groupId: string
	vote: RemovalVoteWithTally
	isTarget: boolean
	myMemberId?: string
}) {
	const { t } = useTranslation()
	const respond = useRespondToVote(groupId)
	const hasResponded = vote.responses.some((response) => response.memberId === myMemberId)

	async function onRespond(choice: "FOR" | "AGAINST" | "ABSTAIN") {
		try {
			await respond.mutateAsync({ voteId: vote.id, choice })
		} catch {
			toast.error(t("groups.members.voteRespondError"))
		}
	}

	return (
		<div className="bg-muted/50 flex flex-col gap-2 rounded-md p-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">{t("groups.members.voteOpen")}</span>
				<div className="text-muted-foreground flex gap-3 text-xs">
					<span>{t("groups.members.tallyFor", { count: vote.tally.FOR })}</span>
					<span>{t("groups.members.tallyAgainst", { count: vote.tally.AGAINST })}</span>
					<span>{t("groups.members.tallyAbstain", { count: vote.tally.ABSTAIN })}</span>
				</div>
			</div>

			{isTarget && (
				<p className="text-muted-foreground text-xs">{t("groups.members.voteAgainstYou")}</p>
			)}

			{!isTarget && hasResponded && (
				<p className="text-muted-foreground text-xs">{t("groups.members.voteResponded")}</p>
			)}

			{!isTarget && !hasResponded && (
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						disabled={respond.isPending}
						onClick={() => void onRespond("FOR")}
					>
						{t("groups.members.voteFor")}
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={respond.isPending}
						onClick={() => void onRespond("AGAINST")}
					>
						{t("groups.members.voteAgainst")}
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={respond.isPending}
						onClick={() => void onRespond("ABSTAIN")}
					>
						{t("groups.members.voteAbstain")}
					</Button>
				</div>
			)}
		</div>
	)
}
