import { useEffect, useState } from 'react'

/**
 * Returns the id of the section currently visible in the viewport.
 * Uses IntersectionObserver with rootMargin tuned so the section
 * counts as "active" once it crosses ~30% from the top of the viewport.
 */
export const useActiveSection = (ids: string[]) => {
	const [active, setActive] = useState<string | null>(null)

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (!ids.length) return

		const elements = ids
			.map((id) => document.getElementById(id))
			.filter((el): el is HTMLElement => el !== null)

		if (!elements.length) return

		const observer = new IntersectionObserver(
			(entries) => {
				// Pick the entry that is intersecting and closest to the top
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
				if (visible.length > 0) {
					setActive(visible[0].target.id)
				}
			},
			{
				rootMargin: '-30% 0px -55% 0px',
				threshold: 0,
			},
		)

		elements.forEach((el) => observer.observe(el))
		return () => observer.disconnect()
	}, [ids])

	return active
}