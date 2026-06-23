import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Label } from './label'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string | ReactNode
	error?: string
	helperText?: string
	icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			label,
			error,
			helperText,
			icon,
			id,
			style,
			...props
		},
		ref,
	) => {
		const inputId = `ipt-${props.name || id}`
		return (
			<div className="w-full">
				{label && (
					<Label
						htmlFor={inputId}
						className="mb-2 block text-sm font-medium text-text-secondary"
					>
						{label}
					</Label>
				)}

				<div className="relative">
					{icon && (
						<div className={cn("pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground", error && 'text-destructive')}>
							{icon}
						</div>
					)}
					<input
						ref={ref}
						id={inputId}
						className={cn(
							'h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
							error &&
								'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
						)}
						style={{
							paddingLeft: icon ? '2.5rem' : undefined,
							...style,
						}}
						aria-invalid={error ? 'true' : 'false'}
						aria-describedby={
							error
								? `${inputId}-error`
								: helperText
									? `${inputId}-helper`
									: undefined
						}
						{...props}
					/>
				</div>

				{error && (
					<p
						id={`${inputId}-error`}
						className="mt-2 text-sm text-destructive"
						role="alert"
					>
						{error}
					</p>
				)}

				{helperText && !error && (
					<p
						id={`${inputId}-helper`}
						className="mt-2 text-xs text-muted-foreground"
					>
						{helperText}
					</p>
				)}
			</div>
		)
	},
)

Input.displayName = 'Input'
