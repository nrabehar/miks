const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 60 * 60],
	["month", 30 * 24 * 60 * 60],
	["day", 24 * 60 * 60],
	["hour", 60 * 60],
	["minute", 60],
]

// Picks the largest whole unit that fits, so "2 hours ago" instead of
// "7238 seconds ago"; anything under a minute reads as "just now".
export function formatRelativeTime(date: Date | string, locale: string): string {
	const target = typeof date === "string" ? new Date(date) : date
	const diffSeconds = (target.getTime() - Date.now()) / 1000
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

	for (const [unit, secondsInUnit] of UNITS) {
		if (Math.abs(diffSeconds) >= secondsInUnit) {
			return rtf.format(Math.round(diffSeconds / secondsInUnit), unit)
		}
	}

	return rtf.format(Math.round(diffSeconds), "second")
}
