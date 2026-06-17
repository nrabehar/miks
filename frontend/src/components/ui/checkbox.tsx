import { type InputHTMLAttributes, forwardRef } from 'react'

interface CheckboxProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'type'
> {
	label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
	({ label, className = '', id, ...props }, ref) => {
		const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-')

		return (
			<label
				htmlFor={checkboxId}
				className="group flex cursor-pointer items-center gap-3"
			>
				<div className="relative">
					<input
						ref={ref}
						type="checkbox"
						id={checkboxId}
						className={`peer sr-only ${className}`}
						{...props}
					/>
					<div className="h-5 w-5 rounded border border-border-default bg-bg-secondary transition-all group-hover:border-border-hover peer-checked:border-primary-600 peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-primary">
						<svg
							className="h-full w-full text-white opacity-0 transition-opacity peer-checked:opacity-100"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
					<svg
						className="pointer-events-none absolute top-0 left-0 h-5 w-5 text-white opacity-0 transition-opacity peer-checked:opacity-90"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
				{label && (
					<span className="text-sm text-text-secondary transition-colors group-hover:text-text-primary">
						{label}
					</span>
				)}
			</label>
		)
	},
)

Checkbox.displayName = 'Checkbox'
