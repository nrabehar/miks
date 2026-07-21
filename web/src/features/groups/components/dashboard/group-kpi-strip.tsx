import { ActivityIcon, CoinsIcon, LandmarkIcon, PieChartIcon, UsersIcon, VoteIcon } from "lucide-react"

import { GroupKpiTile } from "./group-kpi-tile"
import { groupKpis, groupTrends, memberKpis, memberRecords, memberTrends } from "./mock-data"

interface GroupKpiStripProps {
	view: "group" | "member"
}

function percentDelta(current: number, previous: number) {
	return ((current - previous) / previous) * 100
}

export function GroupKpiStrip({ view }: GroupKpiStripProps) {
	if (view === "member") {
		const myGainPercent =
			((memberKpis.myValue - memberKpis.myContribution) / memberKpis.myContribution) * 100
		const totalActiveValue = memberRecords
			.filter((member) => member.status === "ACTIVE")
			.reduce((sum, member) => sum + member.value, 0)
		const myShareOfGroup = (memberKpis.myValue / totalActiveValue) * 100

		return (
			<div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
				<GroupKpiTile
					icon={LandmarkIcon}
					label="Mes apports"
					value={`${memberKpis.myContribution.toLocaleString("fr-FR")} €`}
					trend={memberTrends.myContribution}
				/>
				<GroupKpiTile
					icon={CoinsIcon}
					tone="positive"
					label="Valeur de mes parts"
					value={`${memberKpis.myValue.toLocaleString("fr-FR")} €`}
					delta={{
						label: `+${(memberKpis.myValue - memberKpis.myContribution).toLocaleString("fr-FR")} € (${myGainPercent.toFixed(1)} %)`,
						direction: "up",
					}}
					trend={memberTrends.myValue}
				/>
				<GroupKpiTile
					icon={PieChartIcon}
					tone="info"
					label="Ma part du groupe"
					value={`${myShareOfGroup.toFixed(1)} %`}
					trend={memberTrends.myShare}
				/>
				<GroupKpiTile
					icon={VoteIcon}
					tone="accent"
					label="Mes votes"
					value={memberKpis.myVotesParticipation}
					trend={memberTrends.myVotes}
				/>
			</div>
		)
	}

	const treasuryValueDelta = percentDelta(groupKpis.treasuryValue, groupKpis.previousTreasuryValue)
	const performanceDelta = percentDelta(
		groupKpis.averageProjectPerformance,
		groupKpis.previousAverageProjectPerformance,
	)
	const membersDelta = groupKpis.activeMembers - groupKpis.previousActiveMembers

	return (
		<div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
			<GroupKpiTile
				icon={LandmarkIcon}
				label="Trésorerie"
				value={`${groupKpis.treasury.toLocaleString("fr-FR")} €`}
				trend={groupTrends.treasury}
			/>
			<GroupKpiTile
				icon={CoinsIcon}
				tone="positive"
				label="Valeur des parts"
				value={`${groupKpis.treasuryValue.toLocaleString("fr-FR")} €`}
				delta={{
					label: `${treasuryValueDelta >= 0 ? "+" : ""}${treasuryValueDelta.toFixed(1)} % vs période précédente`,
					direction: treasuryValueDelta >= 0 ? "up" : "down",
				}}
				trend={groupTrends.treasuryValue}
			/>
			<GroupKpiTile
				icon={ActivityIcon}
				tone="info"
				label="Performance projets"
				value={`+${groupKpis.averageProjectPerformance.toFixed(1)} %`}
				delta={{
					label: `${performanceDelta >= 0 ? "+" : ""}${performanceDelta.toFixed(1)} pt vs période précédente`,
					direction: performanceDelta >= 0 ? "up" : "down",
				}}
				trend={groupTrends.performance}
			/>
			<GroupKpiTile
				icon={UsersIcon}
				tone="accent"
				label="Membres actifs"
				value={`${groupKpis.activeMembers}`}
				delta={{
					label: `${membersDelta >= 0 ? "+" : ""}${membersDelta} vs période précédente`,
					direction: membersDelta >= 0 ? "up" : "down",
				}}
				trend={groupTrends.activeMembers}
			/>
		</div>
	)
}
