import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'

interface OtpFormProps {
	onSubmit: (otp: string) => void | Promise<void>
	onResend?: () => void | Promise<void>
	submitting?: boolean
	resendCooldown?: number
	error?: string
}

export const OtpForm = ({
	onSubmit,
	onResend,
	submitting,
	resendCooldown = 60,
	error,
}: OtpFormProps) => {
	const [otp, setOtp] = useState('')
	const [cooldown, setCooldown] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const startCooldown = () => {
		setCooldown(resendCooldown)
		const id = setInterval(() => {
			setCooldown((c) => {
				if (c <= 1) { clearInterval(id); return 0 }
				return c - 1
			})
		}, 1000)
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value.replace(/\D/g, '').slice(0, 6)
		setOtp(raw)
		if (raw.length === 6 && !submitting) {
			onSubmit(raw)
		}
	}

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault()
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
		setOtp(pasted)
		if (pasted.length === 6 && !submitting) {
			onSubmit(pasted)
		}
	}

	return (
		<div className="w-full space-y-5">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					if (otp.length === 6 && !submitting) onSubmit(otp)
				}}
				className="space-y-4"
			>
				<div className="space-y-2">
					<label className="block text-sm font-medium text-muted-foreground">
						Verification code
					</label>
					<input
						ref={inputRef}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						autoComplete="one-time-code"
						placeholder="• • • • • •"
						value={otp}
						onChange={handleChange}
						onPaste={handlePaste}
						maxLength={6}
						disabled={submitting}
						className={cn(
							'h-14 w-full rounded-lg border bg-transparent px-4 text-center text-2xl font-mono tracking-[0.6em] outline-none transition-colors',
							'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
							'disabled:opacity-50 disabled:cursor-not-allowed',
							error
								? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
								: 'border-input',
						)}
					/>
					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}
				</div>

				<Button
					type="submit"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					size="lg"
					disabled={submitting || otp.length < 6}
					isLoading={submitting}
					loadingText="Verifying..."
				>
					Verify code
				</Button>
			</form>

			{onResend && (
				<div className="text-center">
					<p className="text-sm text-muted-foreground">
						Didn't receive the code?{' '}
						<button
							type="button"
							disabled={cooldown > 0}
							onClick={() => {
								onResend()
								startCooldown()
							}}
							className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
						>
							{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
						</button>
					</p>
				</div>
			)}
		</div>
	)
}
