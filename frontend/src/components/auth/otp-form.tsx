import { useState } from 'react'
import { Button } from '../ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp'

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
	resendCooldown,
	error,
}: OtpFormProps) => {
	const [otp, setOtp] = useState<string>('')
	const [cooldown, setCooldown] = useState<number>(0)

	const startCooldown = () => {
		setCooldown(resendCooldown || 0)
		const id = setInterval(() => {
			setCooldown((c) => {
				if (c <= 1) {
					clearInterval(id)
					return 0
				}
				return c - 1
			})
		}, 1000)
	}
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				if (otp.length === 6) onSubmit(otp)
			}}
			className="space-y-6"
		>
			<div className="flex justify-center">
				<InputOTP maxLength={6} value={otp} onChange={setOtp}>
					<InputOTPGroup>
						{[0, 1, 2, 3, 4, 5].map((i) => (
							<InputOTPSlot key={i} index={i} />
						))}
					</InputOTPGroup>
				</InputOTP>
			</div>
			<Button
				type="submit"
				className="w-full"
				disabled={submitting || otp.length < 6}
				isLoading={submitting}
			>
				Verify
			</Button>
			{onResend && (
				<Button
					type="button"
					variant="outline"
					disabled={cooldown > 0}
					onClick={() => {
						onResend()
						startCooldown()
					}}
				>
					{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
				</Button>
			)}
		</form>
	)
}
