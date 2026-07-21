import { AuthenticatedHeader } from "#/components/layout/AuthenticatedHeader"
import { BudgetEfficiencyChart } from "#/features/analytics/components/budget-efficiency-chart"
import { ClubDistributionChart } from "#/features/analytics/components/club-distribution-chart"
import { DashboardHeader } from "#/features/analytics/components/dashboard-header"
import { DashboardKpiGrid } from "#/features/analytics/components/dashboard-kpi-grid"
import { GroupList } from "#/features/analytics/components/group-list"
import { InvestmentEvolutionChart } from "#/features/analytics/components/investment-evolution-chart"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

const searchSchema = z.object({
	page: z.number().int().min(1).optional(),
	groupError: z.enum(["not-a-member"]).optional(),
})

export const Route = createFileRoute("/_authenticated/")({
	validateSearch: searchSchema,
	component: DashboardPage,
})

function DashboardPage() {
	return (
		<div className="min-h-screen">
			<AuthenticatedHeader />
			<main className="w-full space-y-6 px-4 py-6 duration-300 animate-in fade-in sm:px-6 lg:px-8">
				<DashboardHeader />
				<DashboardKpiGrid />

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<InvestmentEvolutionChart />
					<ClubDistributionChart />
				</div>

				<BudgetEfficiencyChart />
				<GroupList />
			</main>
		</div>
	)
}
