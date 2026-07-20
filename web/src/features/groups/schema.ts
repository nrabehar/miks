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
