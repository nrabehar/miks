import { cn } from "#/lib/utils"

export function MiksLogo({
	className,
}: {
	className?: string
}) {
	return (
		<svg
			viewBox="0 0 1024 719"
			className={cn(
				"h-auto w-10",
				className
			)}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M461.457 648.542L291.306 380.079L514.513 370.833H726.808L564.71 646.797C541.788 685.821 485.685 686.769 461.457 648.542Z"
				fill="url(#m_g0)"
			/>
			<path
				d="M167.279 64.3638L4.24689 601.036C-22.9616 690.601 86.8745 757.672 154.158 692.578L371.177 482.622L512 372.094L333.64 47.092C294.995 -23.3255 190.626 -12.4897 167.279 64.3638Z"
				fill="url(#m_g1)"
			/>
			<path
				d="M856.721 64.7841L1019.75 601.456C1046.96 691.021 937.126 758.092 869.842 692.998L652.823 483.042L512 372.514L690.36 47.5122C729.005 -22.9052 833.374 -12.0694 856.721 64.7841Z"
				fill="url(#m_g2)"
			/>
			<defs>
				<radialGradient
					id="m_g0"
					cx="0"
					cy="0"
					r="1"
					gradientTransform="matrix(-6.3055 180.71 -510.977 -17.82 514.942 370.833)"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#5E3010" />
					<stop offset="1" stopColor="#F5751C" />
				</radialGradient>
				<linearGradient
					id="m_g1"
					x1="601.959"
					y1="-181.804"
					x2="74.1733"
					y2="630.68"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#10B981" />
					<stop offset="1" stopColor="#234ABA" />
				</linearGradient>
				<linearGradient
					id="m_g2"
					x1="564.126"
					y1="-62.0311"
					x2="961.633"
					y2="647.452"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#1E3A8A" />
					<stop offset="1" stopColor="#10B981" />
				</linearGradient>
			</defs>
		</svg>
	)
}
