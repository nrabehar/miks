import { useLogout } from "#/features/auth/hooks"
import { Link, useNavigate } from "@tanstack/react-router"
import { t } from "i18next"
import { MiksLogo } from "../brand/logo"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"

export const AuthenticatedHeader = () => {

	const navigate = useNavigate()
	const logout = useLogout()

	async function handleLogout() {
		logout.mutateAsync()
		await navigate({ to: "/auth/login" })
	}


	return (
		<header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 py-3">
			<Link to='/' className="flex items-center gap-2">
				<MiksLogo className="h-7 w-7" />
				<h1 className="font-semibold">Miks</h1>
			</Link>
			<div className="flex items-center gap-4">
				{/* Additional header content can be added here */}
				<DropdownMenu>
						<DropdownMenuTrigger asChild>
							{/* <button
								type="button"
								className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
							>
								<Avatar>
									<AvatarFallback>
										N
									</AvatarFallback> 
								</Avatar>
							</button> */}
							<Button type="button" variant="ghost" className="flex items-center gap-2 rounded-full px-1 pr-2 py-1">
								<Avatar>
									<AvatarFallback>
										N
									</AvatarFallback>
								</Avatar>
								<span className="flex flex-col items-start">
									<span className="font-semibold text-sm">Utilisateur</span>
									<span className="text-muted-foreground text-xs">online</span>
								</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link to="/settings/sessions">{t("auth.sessions.navLabel")}</Link>
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() => void handleLogout()}
								disabled={logout.isPending}
							>
								{t("dashboard.logout")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
			</div>
		</header>
	)
}
