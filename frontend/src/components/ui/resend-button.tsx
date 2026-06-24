import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface ResendButtonProps {
	/** Called when the user clicks resend after the cooldown elapsed. */
	onResend: () => void | Promise<void>
	/** Storage key used to persist the cooldown end timestamp across mounts. */
	storageKey: string
	/** Cooldown duration in seconds (default 60). */
	cooldownSeconds?: number
	/** Label shown when the button is enabled (e.g. "Send again"). */
	label: string
	/** Label shown while the cooldown is active (use {s} as placeholder for seconds). */
	cooldownLabel?: string
	/** Disable the button regardless of cooldown. */
	disabled?: boolean
	className?: string
}

/**
 * A button that triggers a re-send action with a client-side cooldown.
 * The cooldown end timestamp is persisted in sessionStorage so it survives
 * page navigation/re-renders within the same session.
 */
export function ResendButton({
	onResend,
	storageKey,
	cooldownSeconds = 60,
	label,
	cooldownLabel = 'Wait {s}s',
	disabled,
	className,
}: ResendButtonProps) {
	const [remaining, setRemaining] = useState<number>(() => readRemaining(storageKey))
	const inflight = useRef(false)

	useEffect(() => {
		if (remaining <= 0) return
		const id = setInterval(() => {
			setRemaining(readRemaining(storageKey))
		}, 1000)
		return () => clearInterval(id)
	}, [remaining, storageKey])

	const isCooling = remaining > 0
	const isDisabled = disabled || isCooling || inflight.current

	const handleClick = async () => {
		if (isDisabled) return
		inflight.current = true
		try {
			await Promise.resolve(onResend())
			const endsAt = Date.now() + cooldownSeconds * 1000
			sessionStorage.setItem(storageKey, String(endsAt))
			setRemaining(cooldownSeconds)
		} finally {
			inflight.current = false
		}
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={isDisabled}
			className={cn(
				'w-full text-sm underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50',
				isCooling ? 'text-muted-foreground' : 'text-primary font-medium',
				className,
			)}
		>
			{isCooling
				? cooldownLabel.replace('{s}', String(remaining))
				: label}
		</button>
	)
}

function readRemaining(storageKey: string): number {
	if (typeof window === 'undefined') return 0
	const raw = sessionStorage.getItem(storageKey)
	if (!raw) return 0
	const endsAt = Number(raw)
	if (!Number.isFinite(endsAt)) return 0
	const diff = Math.ceil((endsAt - Date.now()) / 1000)
	return diff > 0 ? diff : 0
}