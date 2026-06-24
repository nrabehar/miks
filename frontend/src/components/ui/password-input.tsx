import { cn } from '@/lib/utils'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Label } from './label'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
	label?: string | ReactNode
	error?: string
	helperText?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
	({ className, label, error, helperText, id, ...props }, ref) => {
		const [visible, setVisible] = useState(false)
		const inputId = `ipt-${props.name || id}`

		return (
			<div className="w-full">
				{label && (
					<Label
						htmlFor={inputId}
						className="mb-2 block text-sm font-medium text-muted-foreground"
					>
						{label}
					</Label>
				)}
				<div className="relative">
					<input
						ref={ref}
						id={inputId}
						type={visible ? 'text' : 'password'}
						className={cn(
							'h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 pr-10 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
							error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
							className,
						)}
						aria-invalid={error ? 'true' : 'false'}
						aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
						{...props}
					/>
					<button
						type="button"
						tabIndex={-1}
						aria-label={visible ? 'Hide password' : 'Show password'}
						onClick={() => setVisible((v) => !v)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
					>
						{visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
					</button>
				</div>
				{error && (
					<p id={`${inputId}-error`} className="mt-2 text-sm text-destructive" role="alert">
						{error}
					</p>
				)}
				{helperText && !error && (
					<p id={`${inputId}-helper`} className="mt-2 text-xs text-muted-foreground">
						{helperText}
					</p>
				)}
			</div>
		)
	},
)

PasswordInput.displayName = 'PasswordInput'
