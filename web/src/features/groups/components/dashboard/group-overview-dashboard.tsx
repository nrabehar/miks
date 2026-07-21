import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs"
import type { Group } from "#/features/groups/schema"

import { CreateFlowDialog } from "./create-flow-dialog"
import { CreateProjectDialog } from "./create-project-dialog"
import { GroupActivityTable } from "./group-activity-table"
import {
	GroupDashboardToolbar,
	type DashboardPeriod,
	type DashboardView,
} from "./group-dashboard-toolbar"
import { GroupFlowRulesList } from "./group-flow-rules-list"
import { GroupKpiStrip } from "./group-kpi-strip"
import { GroupMembersTable } from "./group-members-table"
import { GroupProjectsTable } from "./group-projects-table"
import { GroupTreasuryChart } from "./group-treasury-chart"
import { GroupTreasuryGoal } from "./group-treasury-goal"
import { GroupVaultsChart } from "./group-vaults-chart"
import { GroupVaultsList } from "./group-vaults-list"
import { MemberAllocationDonut } from "./member-allocation-donut"
import {
	flowRuleRecords,
	groupProjectRecords,
	memberRecords,
	type FlowRuleRecord,
	type GroupProjectRecord,
} from "./mock-data"

interface GroupOverviewDashboardProps {
	group: Group
}

function exportMembersCsv(groupName: string) {
	const header = "Membre,Statut,Parts (EUR),Rejoint le"
	const rows = memberRecords.map((member) =>
		[
			member.name,
			member.status === "ACTIVE" ? "Actif" : "Parti",
			member.value,
			new Date(member.joinedAt).toLocaleDateString("fr-FR"),
		].join(","),
	)
	const csv = [header, ...rows].join("\n")
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.href = url
	link.download = `${groupName.toLowerCase().replace(/\s+/g, "-")}-membres.csv`
	link.click()
	URL.revokeObjectURL(url)
}

export function GroupOverviewDashboard({ group }: GroupOverviewDashboardProps) {
	const [view, setView] = useState<DashboardView>("group")
	const [period, setPeriod] = useState<DashboardPeriod>("6M")
	const [search, setSearch] = useState("")
	const [projects, setProjects] = useState<GroupProjectRecord[]>(groupProjectRecords)
	const [flowRules, setFlowRules] = useState<FlowRuleRecord[]>(flowRuleRecords)

	return (
		<div className="space-y-4">
			<GroupDashboardToolbar
				group={group}
				view={view}
				onViewChange={setView}
				period={period}
				onPeriodChange={setPeriod}
				search={search}
				onSearchChange={setSearch}
				onExport={() => exportMembersCsv(group.name)}
			/>

			<GroupKpiStrip view={view} />

			<div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<GroupTreasuryChart period={period} className="h-full" />
				</div>
				<div className="flex flex-col gap-4">
					<MemberAllocationDonut />
					<GroupTreasuryGoal className="flex-1" />
				</div>
			</div>

			<Tabs defaultValue="members">
				<TabsList>
					<TabsTrigger value="members">Membres</TabsTrigger>
					<TabsTrigger value="activity">Activité</TabsTrigger>
					<TabsTrigger value="projects">Projets</TabsTrigger>
					<TabsTrigger value="vaults">Coffres</TabsTrigger>
				</TabsList>

				<TabsContent value="members" className="mt-3">
					<GroupMembersTable search={search} />
				</TabsContent>

				<TabsContent value="activity" className="mt-3">
					<GroupActivityTable period={period} />
				</TabsContent>

				<TabsContent value="projects" className="mt-3 space-y-3">
					<div className="flex justify-end">
						<CreateProjectDialog
							onCreate={(project) => setProjects((current) => [project, ...current])}
						/>
					</div>
					<GroupProjectsTable projects={projects} />
				</TabsContent>

				<TabsContent value="vaults" className="mt-3 space-y-4">
					<div className="flex justify-end">
						<CreateFlowDialog onCreate={(rule) => setFlowRules((current) => [rule, ...current])} />
					</div>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<div className="lg:col-span-2">
							<GroupVaultsChart />
						</div>
						<GroupVaultsList />
					</div>
					<GroupFlowRulesList rules={flowRules} />
				</TabsContent>
			</Tabs>
		</div>
	)
}
