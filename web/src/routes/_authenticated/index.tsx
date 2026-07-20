import { AuthenticatedHeader } from "#/components/layout/AuthenticatedHeader"
import {
	createFileRoute
} from "@tanstack/react-router"
import { ActivityIcon, LandmarkIcon, PieChartIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { z } from "zod"

// const PAGE_SIZE = 20

const searchSchema = z.object({
	page: z.number().int().min(1).optional(),
	groupError: z.enum(["not-a-member"]).optional(),
})

export const Route = createFileRoute("/_authenticated/")({
	validateSearch: searchSchema,
	// A user with zero groups lands directly in the create group form
	// instead of an empty dashboard (spec 0003-group-membership-ui AC-1).
	// A fetch failure here (offline, transient error) is not a reason to
	// block the whole route: fall through to the dashboard, whose own
	// useGroups query renders the usual loading/error/offline-cache state.
	// beforeLoad: async ({ context: { queryClient } }) => {
	// 	try {
	// 		const firstPage = await queryClient.ensureQueryData(
	// 			groupsListQueryOptions({ page: 1, limit: PAGE_SIZE }),
	// 		)

	// 		if (firstPage.total === 0) {
	// 			throw redirect({ to: "/groups/new" })
	// 		}
	// 	} catch (error) {
	// 		if (isRedirect(error)) {
	// 			throw error
	// 		}
	// 	}
	// },
	component: DashboardPage,
})

function DashboardPage() {
	// const { t } = useTranslation()
	// const navigate = useNavigate()
	// const { data: user, isPending: userPending } = useMe()
	// const logout = useLogout()
	// const { page = 1, groupError } = Route.useSearch()
	// const { data: groupsPage, isPending } = useGroups({
	// 	page,
	// 	limit: PAGE_SIZE,
	// })

	// useEffect(() => {
	// 	if (groupError === "not-a-member") {
	// 		toast.error(t("groups.dashboard.notAMember"))
	// 		void navigate({ to: "/", search: {}, replace: true })
	// 	}
	// }, [groupError, navigate, t])

	// async function handleLogout() {
	// 	await logout.mutateAsync()
	// 	await navigate({ to: "/auth/login" })
	// }

	// const initials = user?.displayName
	// 	.split(" ")
	// 	.map((part) => part[0])
	// 	.join("")
	// 	.slice(0, 2)
	// 	.toUpperCase()

	// const totalPages = groupsPage ? Math.max(1, Math.ceil(groupsPage.total / PAGE_SIZE)) : 1
	interface HistoricalData {
		name: string
		invested: number
		theoreticalValue: number
	}

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
		  return (
			<div className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl p-3 shadow-xl font-mono text-[11px] text-white space-y-1">
			  <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1 mb-1">{label}</p>
			  {payload.map((pld: any, index: number) => (
				<div key={index} className="flex justify-between items-center gap-4">
				  <span className="text-zinc-400 flex items-center gap-1.5">
					<span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pld.color }} />
					{pld.name}:
				  </span>
				  <span className="font-bold" style={{ color: pld.color }}>
					{pld.value.toLocaleString('fr-FR')} €
				  </span>
				</div>
			  ))}
			</div>
		  );
		}
		return null;
	  };

	return (
		<div className="min-h-screen">
			<AuthenticatedHeader />
			<main className="space-y-6 animate-in fade-in duration-300 w-full px-4 py-6 sm:px-6 lg:px-8">
				<div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		
					<div className="rounded-2xl border p-5 bg-card shadow-2xs hover:shadow-xs transition-all">
						<div className="flex justify-between items-start">
							<span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Total Investi</span>
							<LandmarkIcon className="h-3.5 w-3.5 text-zinc-400" />
						</div>
						<span className="font-mono text-2xl font-black text-zinc-950 mt-1 block">
							25000 €
						</span>
						<span className="text-[10px] text-zinc-400 block mt-1 font-medium">Cumul brut de mes apports</span>
					</div>
		
					<div className="rounded-2xl border p-5 bg-card shadow-2xs hover:shadow-xs transition-all">
						<div className="flex justify-between items-start">
							<span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Total Investi</span>
							<LandmarkIcon className="h-3.5 w-3.5 text-zinc-400" />
						</div>
						<span className="font-mono text-2xl font-black text-zinc-950 mt-1 block">
							25000 €
						</span>
						<span className="text-[10px] text-zinc-400 block mt-1 font-medium">Cumul brut de mes apports</span>
					</div>
					
					<div className="rounded-2xl border p-5 bg-card shadow-2xs hover:shadow-xs transition-all">
						<div className="flex justify-between items-start">
							<span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Total Investi</span>
							<LandmarkIcon className="h-3.5 w-3.5 text-zinc-400" />
						</div>
						<span className="font-mono text-2xl font-black text-zinc-950 mt-1 block">
							25000 €
						</span>
						<span className="text-[10px] text-zinc-400 block mt-1 font-medium">Cumul brut de mes apports</span>
					</div>
					
					<div className="rounded-2xl border p-5 bg-card shadow-2xs hover:shadow-xs transition-all">
						<div className="flex justify-between items-start">
							<span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Total Investi</span>
							<LandmarkIcon className="h-3.5 w-3.5 text-zinc-400" />
						</div>
						<span className="font-mono text-2xl font-black text-zinc-950 mt-1 block">
							25000 €
						</span>
						<span className="text-[10px] text-zinc-400 block mt-1 font-medium">Cumul brut de mes apports</span>
					</div>

				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6 shadow-sm flex flex-col justify-between min-h-90">
						<div>
							<div className="flex items-center justify-between">
								<h3 className='font-display text-xs font-medium uppercase tracking-wider font-mono flex items-center gap-2'>
									<ActivityIcon className="h-4 w-4 text-emerald-500" />
									évolution historique des investissements
								</h3>
								<span className="rounded-full bg-card px-2.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
									Mensuel
								</span>
							</div>
							<p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">
								Suivi de l'évolution de vos apports cumulés comparée à la valorisation théorique en temps réel de vos parts.
							</p>
						</div>
						<div className="h-64 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={[] as HistoricalData[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
									<defs>
									<linearGradient id="gradientApports" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
										<stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
									</linearGradient>
									<linearGradient id="gradientValeur" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
										<stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
									</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
									<XAxis 
										dataKey="name" 
										stroke="#a1a1aa" 
										fontSize={10} 
										tickLine={false} 
										axisLine={false} 
										dy={10}
									/>
									<YAxis 
										stroke="#a1a1aa" 
										fontSize={10} 
										tickLine={false} 
										axisLine={false} 
										tickFormatter={(val) => `${val} €`}
									/>
									<ChartTooltip content={<CustomTooltip />} />
									<Legend 
										verticalAlign="top" 
										height={36} 
										iconType="circle" 
										iconSize={6}
										wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }} 
									/>
									<Area 
										name="Mes Apports"
										type="monotone" 
										dataKey="Mes Apports" 
										stroke="#27272a" 
										strokeWidth={2}
										strokeDasharray="4 4"
										fillOpacity={1} 
										fill="url(#gradientApports)" 
									/>
									<Area 
										name="Valeur Parts"
										type="monotone" 
										dataKey="Valeur Parts" 
										stroke="#10b981" 
										strokeWidth={2.5}
										fillOpacity={1} 
										fill="url(#gradientValeur)" 
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>
					<div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm flex flex-col justify-between min-h-90">
						<div>
							<h3 className='font-display text-xs font-medium uppercase tracking-wider font-mono flex items-center gap-2'>
								<PieChartIcon className="h-4 w-4 text-muted-foreground" />
								Répartition par groupe
							</h3>
							<p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">
								Distribution proportionnelle de la valeur totale consolidée de vos parts.
							</p>
						</div>
						<div className="h-44 w-full relative flex items-center justify-center">
							{/* Pie chart */}
							<div className="text-center text-xs text-muted-foreground font-mono">Aucun actif enregistré</div>
							<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
								<span className="font-mono text-lg font-medium">100%</span>
              					<span className="text-xs text-muted-foreground font-bold uppercase tracking-wider font-mono">Investi</span>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}
