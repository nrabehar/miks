import { useEffect, useRef, useState } from "react"

// Tracks a countdown after hitting the resend-verification / forgot-password
// rate limit (429, capped at 3/minute server side, spec 0002-auth-flows AC-11).
// This is a UX courtesy only, not a security control: the real throttle lives
// server side.
export function useCooldown() {
	const [remaining, setRemaining] = useState(0)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current)
		}
	}, [])

	function start(seconds: number) {
		setRemaining(seconds)

		if (intervalRef.current) clearInterval(intervalRef.current)

		intervalRef.current = setInterval(() => {
			setRemaining((current) => {
				if (current <= 1) {
					if (intervalRef.current) clearInterval(intervalRef.current)
					return 0
				}
				return current - 1
			})
		}, 1000)
	}

	return { remaining, active: remaining > 0, start }
}
