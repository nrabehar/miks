// Per-group/per-member analytics aren't served by the API yet (Group/GroupMember
// only carry membership state — see features/groups/schema.ts). This mock data
// lets the group dashboard read as finished; swap for the real analytics
// endpoint once it exists.

export const groupKpis = {
	treasury: 42500,
	treasuryValue: 46100,
	treasuryGoal: 60000,
	previousTreasuryValue: 41200,
	averageProjectPerformance: 9.4,
	previousAverageProjectPerformance: 7.1,
	projectRevenueShare: 28,
	activeMembers: 6,
	previousActiveMembers: 5,
	projectsCount: 3,
	openVotesCount: 1,
}

export const memberKpis = {
	myContribution: 6400,
	myValue: 6950,
	myVotesParticipation: "4/5",
}

// Short trend series for the KPI tiles' inline sparklines — the last 6
// months, most recent last. Swap for the real analytics endpoint's history
// once it exists.
export const groupTrends = {
	treasury: [27100, 31000, 34200, 36900, 38700, 40300, 42500],
	treasuryValue: [28600, 32900, 36500, 39600, 41700, 43600, 46100],
	performance: [5.8, 6.4, 7.1, 7.8, 8.5, 9.0, 9.4],
	activeMembers: [4, 4, 5, 5, 6, 6, 6],
}

export const memberTrends = {
	myContribution: [2400, 3200, 4000, 4900, 5600, 6000, 6400],
	myValue: [2450, 3320, 4180, 5160, 5900, 6420, 6950],
	myShare: [12.1, 13.0, 13.6, 14.2, 14.7, 15.0, 15.1],
	myVotes: [1, 1, 2, 2, 3, 4, 4],
}

export function memberInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase()
}

export type MemberStatus = "ACTIVE" | "LEFT"

export interface MemberRecord {
	id: string
	name: string
	status: MemberStatus
	value: number
	joinedAt: string
}

// "Vous" (mem-you) is always present: components that highlight the current
// member rely on matching this id rather than a real auth user id.
export const memberRecords: MemberRecord[] = [
	{ id: "mem-you", name: "Vous", status: "ACTIVE", value: 6950, joinedAt: "2025-09-12T00:00:00.000Z" },
	{ id: "mem-1", name: "R. Andria", status: "ACTIVE", value: 9800, joinedAt: "2025-09-12T00:00:00.000Z" },
	{ id: "mem-2", name: "H. Rakoto", status: "ACTIVE", value: 8200, joinedAt: "2025-09-20T00:00:00.000Z" },
	{ id: "mem-3", name: "M. Rasoa", status: "ACTIVE", value: 7400, joinedAt: "2025-10-01T00:00:00.000Z" },
	{ id: "mem-4", name: "T. Randria", status: "ACTIVE", value: 7800, joinedAt: "2025-10-15T00:00:00.000Z" },
	{ id: "mem-5", name: "L. Rakotomalala", status: "ACTIVE", value: 5950, joinedAt: "2025-11-02T00:00:00.000Z" },
	{ id: "mem-6", name: "J. Ravao", status: "LEFT", value: 3550, joinedAt: "2025-09-15T00:00:00.000Z" },
]

export type ActivityType = "contribution" | "vote" | "project" | "member"

export interface ActivityRecord {
	id: string
	date: string
	type: ActivityType
	description: string
	amount: number | null
}

export const activityRecords: ActivityRecord[] = [
	{ id: "evt-1", date: "2026-07-18T10:00:00.000Z", type: "contribution", description: "R. Andria a versé un apport", amount: 800 },
	{ id: "evt-2", date: "2026-07-15T09:00:00.000Z", type: "vote", description: "Vote ouvert sur le financement de l'atelier textile", amount: null },
	{ id: "evt-3", date: "2026-07-10T14:00:00.000Z", type: "project", description: "Micro-crédit agricole a reçu un financement", amount: 8000 },
	{ id: "evt-4", date: "2026-07-02T08:00:00.000Z", type: "member", description: "M. Rasoa a rejoint le groupe", amount: null },
	{ id: "evt-5", date: "2026-06-28T11:00:00.000Z", type: "contribution", description: "Vous avez versé un apport", amount: 600 },
	{ id: "evt-6", date: "2026-06-14T16:00:00.000Z", type: "project", description: "Rénovation locale a été clôturé avec des gains", amount: 1800 },
	{ id: "evt-7", date: "2026-05-30T13:00:00.000Z", type: "vote", description: "Vote clos : exclusion refusée", amount: null },
	{ id: "evt-8", date: "2026-05-18T09:30:00.000Z", type: "contribution", description: "T. Randria a versé un apport", amount: 1200 },
	{ id: "evt-9", date: "2026-04-22T10:00:00.000Z", type: "member", description: "T. Randria a rejoint le groupe", amount: null },
	{ id: "evt-10", date: "2026-03-05T15:00:00.000Z", type: "contribution", description: "H. Rakoto a versé un apport", amount: 1500 },
	{ id: "evt-11", date: "2026-02-11T08:00:00.000Z", type: "project", description: "Atelier textile a reçu un financement", amount: 6000 },
	{ id: "evt-12", date: "2025-12-20T12:00:00.000Z", type: "contribution", description: "M. Rasoa a versé un apport", amount: 2000 },
]

export type GroupProjectStatus = "EN_ATTENTE" | "EN_COURS" | "TERMINE"

export interface GroupProjectRecord {
	id: string
	name: string
	description: string
	status: GroupProjectStatus
	sourceCoffreId: string
	budget: number
	gains: number
}

export const groupProjectRecords: GroupProjectRecord[] = [
	{
		id: "prj-1",
		name: "Rénovation locale",
		description: "Réfection d'un local communautaire loué à des artisans.",
		status: "TERMINE",
		sourceCoffreId: "cof-4",
		budget: 12000,
		gains: 13800,
	},
	{
		id: "prj-2",
		name: "Micro-crédit agricole",
		description: "Prêts courts aux coopératives agricoles partenaires.",
		status: "EN_COURS",
		sourceCoffreId: "cof-2",
		budget: 8000,
		gains: 7600,
	},
	{
		id: "prj-3",
		name: "Atelier textile",
		description: "Financement de machines pour un atelier de couture.",
		status: "EN_COURS",
		sourceCoffreId: "cof-2",
		budget: 6000,
		gains: 6900,
	},
]

// Coffres — see docs/miks.doc.html "Coffres & Flux": a group creates as many
// coffres (vaults) as it needs; MIKS prescribes neither their number nor
// their purpose. Balances sum to groupKpis.treasury.
export interface CoffreRecord {
	id: string
	name: string
	balance: number
}

export const coffreRecords: CoffreRecord[] = [
	{ id: "cof-1", name: "Coffre Épargne", balance: 18500 },
	{ id: "cof-2", name: "Coffre Investissement", balance: 14200 },
	{ id: "cof-3", name: "Coffre Urgence", balance: 6800 },
	{ id: "cof-4", name: "Coffre Projets", balance: 3000 },
]

// Every member also has a personal withdrawable vault ("coffre rétirable"):
// a valid flow destination alongside the group's own coffres.
export const RETIRABLE_DESTINATION_ID = "RETIRABLE"

export type FlowSourceType = "COTISATION" | "PROJET" | "MANUEL"

export const FLOW_SOURCE_LABEL: Record<FlowSourceType, string> = {
	COTISATION: "Cotisation",
	PROJET: "Revenu de projet",
	MANUEL: "Entrée manuelle",
}

export interface FlowDestination {
	coffreId: string
	percentage: number
}

export interface FlowRuleRecord {
	id: string
	source: FlowSourceType
	destinations: FlowDestination[]
	createdAt: string
}

export const flowRuleRecords: FlowRuleRecord[] = [
	{
		id: "flow-1",
		source: "COTISATION",
		destinations: [
			{ coffreId: "cof-1", percentage: 25 },
			{ coffreId: "cof-2", percentage: 25 },
			{ coffreId: "cof-3", percentage: 25 },
			{ coffreId: "cof-4", percentage: 25 },
		],
		createdAt: "2025-09-12T00:00:00.000Z",
	},
	{
		id: "flow-2",
		source: "PROJET",
		destinations: [
			{ coffreId: "cof-2", percentage: 25 },
			{ coffreId: "cof-4", percentage: 25 },
			{ coffreId: RETIRABLE_DESTINATION_ID, percentage: 50 },
		],
		createdAt: "2025-11-18T00:00:00.000Z",
	},
]

export interface TreasuryPoint {
	month: string
	treasury: number
	theoreticalValue: number
}

// 12 months of history so the period selector (3/6/12 mois) has something
// real to slice; the last point matches groupKpis.treasury/treasuryValue.
export const treasuryHistory: TreasuryPoint[] = [
	{ month: "Août 25", treasury: 6000, theoreticalValue: 6000 },
	{ month: "Sep 25", treasury: 11500, theoreticalValue: 11800 },
	{ month: "Oct 25", treasury: 17200, theoreticalValue: 17900 },
	{ month: "Nov 25", treasury: 22800, theoreticalValue: 23900 },
	{ month: "Déc 25", treasury: 27100, theoreticalValue: 28600 },
	{ month: "Jan 26", treasury: 31000, theoreticalValue: 32900 },
	{ month: "Fév 26", treasury: 34200, theoreticalValue: 36500 },
	{ month: "Mar 26", treasury: 36900, theoreticalValue: 39600 },
	{ month: "Avr 26", treasury: 38700, theoreticalValue: 41700 },
	{ month: "Mai 26", treasury: 40300, theoreticalValue: 43600 },
	{ month: "Juin 26", treasury: 41400, theoreticalValue: 44900 },
	{ month: "Juil 26", treasury: 42500, theoreticalValue: 46100 },
]

const coffresTotal = coffreRecords.reduce((sum, coffre) => sum + coffre.balance, 0)
const COFFRE_SHARE: Record<string, number> = Object.fromEntries(
	coffreRecords.map((coffre) => [coffre.id, coffre.balance / coffresTotal]),
)

// Per-coffre balance history, derived from the group's overall treasury
// history using each coffre's current share of the total — an approximation
// until the real per-coffre ledger exists.
export const coffreHistory = treasuryHistory.map((point) => ({
	month: point.month,
	...Object.fromEntries(
		coffreRecords.map((coffre) => [coffre.id, Math.round(point.treasury * COFFRE_SHARE[coffre.id])]),
	),
}))
