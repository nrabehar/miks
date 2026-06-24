import { cn } from "#/lib/utils"

interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string
	description?: React.ReactNode
	children: React.ReactNode
	footer?: React.ReactNode
}

export const AuthCard = ({
	title,
	description,
	children,
	footer,
	className,
	...props
}: AuthCardProps) => {
	return (
		<div className={cn("space-y-6", className)} {...props}>
			<div className="space-y-2 text-center lg:text-left">
				<h1 className="text-2xl font-semibold tracking-tight">
					{title}
				</h1>
				{description && (
					<p className="text-sm text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			{children}
			{footer && (
				<div className="text-center text-sm text-muted-foreground">
					{footer}
				</div>
			)}
		</div>
	)
}
