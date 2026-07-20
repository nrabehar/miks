import { z } from "zod"

// Currency list follows the spec's own assumption (0003-group-membership-ui,
// Follow-up): confirm the real supported list with product before adding more.
export const CURRENCY_CODES = ["MGA", "EUR", "USD"] as const

// Mirrors Group (api/src/modules/groups/groups.service.ts).
export const groupStatusSchema = z.enum(["ACTIVE", "CLOSED"])

export const groupSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	creatorId: z.string(),
	currencyCode: z.string(),
	status: groupStatusSchema,
	closedAt: z.string().nullable(),
	createdAt: z.string(),
})

export type Group = z.infer<typeof groupSchema>

// Mirrors GroupMember (api/src/modules/groups/groups.service.ts).
export const memberStatusSchema = z.enum(["ACTIVE", "LEFT"])

export const groupMemberSchema = z.object({
	id: z.string(),
	groupId: z.string(),
	userId: z.string(),
	status: memberStatusSchema,
	joinedAt: z.string(),
	leftAt: z.string().nullable(),
})

export type GroupMember = z.infer<typeof groupMemberSchema>

// Mirrors GroupInvite (api/src/modules/groups/invites.service.ts). The raw
// token is never returned by any endpoint except the public preview/accept
// routes, which take it as a URL param, not a response field.
export const groupInviteStatusSchema = z.enum([
	"PENDING",
	"ACCEPTED",
	"REVOKED",
	"EXPIRED",
])

export const groupInviteSchema = z.object({
	id: z.string(),
	groupId: z.string(),
	email: z.string(),
	status: groupInviteStatusSchema,
	invitedByMemberId: z.string(),
	expiresAt: z.string(),
	createdAt: z.string(),
	acceptedAt: z.string().nullable(),
})

export type GroupInvite = z.infer<typeof groupInviteSchema>

// Mirrors GET /invites/:token's public preview (api/src/modules/groups/invites.controller.ts).
export const invitePreviewSchema = z.object({
	groupName: z.string(),
	invitedBy: z.string(),
	expiresAt: z.string(),
})

export type InvitePreview = z.infer<typeof invitePreviewSchema>

// Mirrors Vote/VoteResponse (api/prisma/models/vote.prisma). Only the
// MEMBER_REMOVAL subject type is used from the groups feature; the shared
// Vote model also backs PROJECT votes elsewhere in the API.
export const voteChoiceSchema = z.enum(["FOR", "AGAINST", "ABSTAIN"])

export type VoteChoice = z.infer<typeof voteChoiceSchema>

export const voteStatusSchema = z.enum(["OPEN", "APPROVED", "REJECTED", "INVALID"])

export const voteResponseSchema = z.object({
	id: z.string(),
	voteId: z.string(),
	memberId: z.string(),
	choice: voteChoiceSchema,
	votedAt: z.string(),
})

export type VoteResponse = z.infer<typeof voteResponseSchema>

export const voteTallySchema = z.object({
	FOR: z.number(),
	AGAINST: z.number(),
	ABSTAIN: z.number(),
})

// GET /groups/:id/removal-votes and the propose endpoint's response both
// return a MEMBER_REMOVAL Vote; the discovery endpoint additionally batches
// in each vote's responses and tally so the member list can render a live
// tally with a single request, no per-vote follow-up fetch.
export const removalVoteSchema = z.object({
	id: z.string(),
	groupId: z.string(),
	targetMemberId: z.string(),
	approvalThreshold: z.coerce.number(),
	minQuorum: z.number(),
	durationHours: z.number(),
	openedAt: z.string(),
	scheduledCloseAt: z.string(),
	actualCloseAt: z.string().nullable(),
	status: voteStatusSchema,
})

export type RemovalVote = z.infer<typeof removalVoteSchema>

export const removalVoteWithTallySchema = removalVoteSchema.extend({
	responses: z.array(voteResponseSchema),
	tally: voteTallySchema,
})

export type RemovalVoteWithTally = z.infer<typeof removalVoteWithTallySchema>

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
	return z.object({
		data: z.array(item),
		page: z.number(),
		limit: z.number(),
		total: z.number(),
	})
}

export const groupsPageSchema = paginatedSchema(groupSchema)
export const membersPageSchema = paginatedSchema(groupMemberSchema)
export const invitesPageSchema = paginatedSchema(groupInviteSchema)
export const removalVotesPageSchema = paginatedSchema(removalVoteWithTallySchema)

export const createGroupSchema = z.object({
	name: z.string().min(1, "Le nom est requis"),
	description: z.string().optional(),
	currencyCode: z.enum(CURRENCY_CODES),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>

export const updateGroupSchema = z.object({
	name: z.string().min(1, "Le nom est requis"),
	description: z.string().optional(),
	currencyCode: z.enum(CURRENCY_CODES),
})

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>

export const inviteEmailSchema = z.object({
	email: z.email("Entrez une adresse e-mail valide"),
})

export type InviteEmailInput = z.infer<typeof inviteEmailSchema>

// The propose removal vote form only asks for a duration (spec
// 0003-group-membership-ui AC-9): approvalThreshold and minQuorum are
// computed to the mandatory floor from the group's active member count,
// never asked of the proposer.
export const proposeRemovalVoteFormSchema = z.object({
	durationHours: z.coerce.number().int().min(1, "La durée doit être d'au moins 1 heure"),
})

export type ProposeRemovalVoteFormInput = z.infer<typeof proposeRemovalVoteFormSchema>

export interface ProposeRemovalVoteInput {
	approvalThreshold: number
	minQuorum: number
	durationHours: number
}
