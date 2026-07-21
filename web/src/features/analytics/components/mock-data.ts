export interface InvestmentPoint {
	month: string
	invested: number
	theoreticalValue: number
}

export const investmentHistory: InvestmentPoint[] = [
	{ month: "Jan", invested: 12000, theoreticalValue: 12000 },
	{ month: "Fév", invested: 24000, theoreticalValue: 24800 },
	{ month: "Mar", invested: 38000, theoreticalValue: 39600 },
	{ month: "Avr", invested: 51000, theoreticalValue: 53200 },
	{ month: "Mai", invested: 63000, theoreticalValue: 66900 },
	{ month: "Juin", invested: 74000, theoreticalValue: 79400 },
	{ month: "Juil", invested: 82000, theoreticalValue: 89100 },
	{ month: "Août", invested: 89000, theoreticalValue: 97800 },
	{ month: "Sep", invested: 96000, theoreticalValue: 106300 },
	{ month: "Oct", invested: 102000, theoreticalValue: 113700 },
	{ month: "Nov", invested: 108000, theoreticalValue: 118200 },
	{ month: "Déc", invested: 112000, theoreticalValue: 121450 },
]

export interface ClubShare {
	name: string
	value: number
}

export const clubShares: ClubShare[] = [
	{ name: "Club Épargne Nord", value: 42500 },
	{ name: "Club Immobilier Sud", value: 31800 },
	{ name: "Club Tech Invest", value: 18200 },
	{ name: "Club Agro Ouest", value: 9600 },
	{ name: "Autres", value: 4900 },
]

export interface BudgetEfficiencyPoint {
	project: string
	budget: number
	gains: number
}

export const budgetEfficiency: BudgetEfficiencyPoint[] = [
	{ project: "Rénov. Nord", budget: 18000, gains: 21400 },
	{ project: "Agro Ouest", budget: 12000, gains: 9800 },
	{ project: "Tech Invest", budget: 22000, gains: 26500 },
	{ project: "Immo Sud", budget: 15000, gains: 14100 },
	{ project: "Éco Solaire", budget: 9000, gains: 11200 },
]

export { mockGroups, mockGroupStats, type GroupStats } from "#/features/groups/mock-data"
