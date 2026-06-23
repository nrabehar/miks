import { Button } from '#/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from '#/components/ui/input-otp'
import { motion } from 'framer-motion'
import { RefreshCwIcon } from 'lucide-react'

export const EmailConfirmForm = () => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<Card className="mx-auto max-w-md">
				<CardHeader>
					<CardTitle>Verify your login</CardTitle>
					<CardDescription>
						Enter the verification code we sent to your email
						address:{' '}
						<span className="font-medium">m@example.com</span>.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form>
						<Field>
							<div className="flex items-center justify-between">
								<FieldLabel htmlFor="otp-verification">
									Verification code
								</FieldLabel>
								<Button variant="outline" size="xs">
									<RefreshCwIcon />
									Resend Code
								</Button>
							</div>
							<InputOTP
								maxLength={6}
								id="otp-verification"
								required
							>
								<InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
									<InputOTPSlot index={0} />
									<InputOTPSlot index={1} />
									<InputOTPSlot index={2} />
								</InputOTPGroup>
								<InputOTPSeparator className="mx-2" />
								<InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
									<InputOTPSlot index={3} />
									<InputOTPSlot index={4} />
									<InputOTPSlot index={5} />
								</InputOTPGroup>
							</InputOTP>
							<FieldDescription>
								<a href="#">
									I no longer have access to this email
									address.
								</a>
							</FieldDescription>
						</Field>
					</form>
				</CardContent>
				<CardFooter>
					<Field>
						<Button type="submit" className="w-full">
							Verify
						</Button>
						<div className="text-sm text-muted-foreground">
							Having trouble signing in?{' '}
							<a
								href="#"
								className="underline underline-offset-4 transition-colors hover:text-primary"
							>
								Contact support
							</a>
						</div>
					</Field>
				</CardFooter>
			</Card>
		</motion.div>
	)
}
