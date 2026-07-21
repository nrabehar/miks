import type { Group, GroupInvite, GroupMember } from "./schema"

// Stand-in for the groups API until a backend is available to point the
// frontend at. Shapes match groupSchema/groupMemberSchema/groupInviteSchema
// (features/groups/schema.ts) so swapping back to useGroups/useMembers/
// useInvites later is a one-line change per consumer, not a rewrite.
export const mockGroups: Group[] = [
	{
		id: "grp-epargne-nord",
		name: "Club Épargne Nord",
		description: "Épargne collective et financement de projets locaux",
		creatorId: "user-1",
		currencyCode: "EUR",
		status: "ACTIVE",
		closedAt: null,
		createdAt: "2025-09-12T00:00:00.000Z",
	},
	{
		id: "grp-immobilier-sud",
		name: "Club Immobilier Sud",
		description: "Investissement collectif dans l'immobilier locatif",
		creatorId: "user-2",
		currencyCode: "EUR",
		status: "ACTIVE",
		closedAt: null,
		createdAt: "2025-10-03T00:00:00.000Z",
	},
	{
		id: "grp-tech-invest",
		name: "Club Tech Invest",
		description: "Prises de participation dans des start-ups locales",
		creatorId: "user-1",
		currencyCode: "EUR",
		status: "ACTIVE",
		closedAt: null,
		createdAt: "2025-11-18T00:00:00.000Z",
	},
	{
		id: "grp-agro-ouest",
		name: "Club Agro Ouest",
		description: "Financement de coopératives agricoles",
		creatorId: "user-3",
		currencyCode: "MGA",
		status: "ACTIVE",
		closedAt: null,
		createdAt: "2025-12-01T00:00:00.000Z",
	},
	{
		id: "grp-eco-solaire",
		name: "Club Éco Solaire",
		description: "Projets d'énergie solaire partagée",
		creatorId: "user-2",
		currencyCode: "EUR",
		status: "CLOSED",
		closedAt: "2026-06-01T00:00:00.000Z",
		createdAt: "2025-06-20T00:00:00.000Z",
	},
]

export function findMockGroup(groupId: string): Group | undefined {
	return mockGroups.find((group) => group.id === groupId)
}

const MOCK_MEMBERS_BY_GROUP: Record<string, GroupMember[]> = {
	"grp-epargne-nord": [
		{ id: "mem-1", groupId: "grp-epargne-nord", userId: "user-you", status: "ACTIVE", joinedAt: "2025-09-12T00:00:00.000Z", leftAt: null },
		{ id: "mem-2", groupId: "grp-epargne-nord", userId: "user-1", status: "ACTIVE", joinedAt: "2025-09-12T00:00:00.000Z", leftAt: null },
		{ id: "mem-3", groupId: "grp-epargne-nord", userId: "user-3", status: "ACTIVE", joinedAt: "2025-09-20T00:00:00.000Z", leftAt: null },
		{ id: "mem-4", groupId: "grp-epargne-nord", userId: "user-4", status: "ACTIVE", joinedAt: "2025-10-01T00:00:00.000Z", leftAt: null },
		{ id: "mem-5", groupId: "grp-epargne-nord", userId: "user-5", status: "LEFT", joinedAt: "2025-09-15T00:00:00.000Z", leftAt: "2026-01-10T00:00:00.000Z" },
	],
}

export function findMockMembers(groupId: string): GroupMember[] {
	return MOCK_MEMBERS_BY_GROUP[groupId] ?? []
}

const MOCK_INVITES_BY_GROUP: Record<string, GroupInvite[]> = {
	"grp-epargne-nord": [
		{
			id: "inv-1",
			groupId: "grp-epargne-nord",
			email: "rina.andria@example.com",
			status: "PENDING",
			invitedByMemberId: "mem-1",
			expiresAt: "2026-08-01T00:00:00.000Z",
			createdAt: "2026-07-18T00:00:00.000Z",
			acceptedAt: null,
		},
	],
}

export function findMockInvites(groupId: string): GroupInvite[] {
	return MOCK_INVITES_BY_GROUP[groupId] ?? []
}

export interface GroupStats {
	invested: number
	value: number
	membersCount: number
	projectsCount: number
	openVotesCount: number
}

// Per-group analytics aren't served by the API yet (Group only carries
// name/currency/status): this cycles a small set of plausible figures over
// the mock group list so the dashboard reads as finished. Replace with the
// real per-group analytics endpoint once it exists.
const MOCK_GROUP_STATS: GroupStats[] = [
	{ invested: 42500, value: 46100, membersCount: 8, projectsCount: 3, openVotesCount: 1 },
	{ invested: 31800, value: 33950, membersCount: 6, projectsCount: 2, openVotesCount: 0 },
	{ invested: 18200, value: 19850, membersCount: 5, projectsCount: 2, openVotesCount: 1 },
	{ invested: 9600, value: 9120, membersCount: 4, projectsCount: 1, openVotesCount: 0 },
	{ invested: 12300, value: 13480, membersCount: 7, projectsCount: 2, openVotesCount: 2 },
]

export function mockGroupStats(index: number): GroupStats {
	return MOCK_GROUP_STATS[index % MOCK_GROUP_STATS.length]
}
