import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

interface GroupBreadcrumbsProps {
	groupId: string
	groupName: string
	section: string
}

export function GroupBreadcrumbs({ groupId, groupName, section }: GroupBreadcrumbsProps) {
	const { t } = useTranslation()

	return (
		<nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-muted-foreground">
			<Link to="/" className="transition-colors hover:text-foreground">
				{t("groups.sidebar.backToGroups")}
			</Link>
			<ChevronRightIcon className="h-3 w-3 shrink-0" aria-hidden />
			<Link
				to="/groups/$groupId"
				params={{ groupId }}
				activeOptions={{ exact: true }}
				className="max-w-40 truncate transition-colors hover:text-foreground sm:max-w-none"
			>
				{groupName}
			</Link>
			<ChevronRightIcon className="h-3 w-3 shrink-0" aria-hidden />
			<span className="font-medium text-foreground">{section}</span>
		</nav>
	)
}
