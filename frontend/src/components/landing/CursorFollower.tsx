import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect } from 'react'

/**
 * Subtle cursor follower that avoids React re-renders on every mouse event
 * by using useMotionValue for all dynamic state (scale, opacity).
 */
export const CursorFollower = () => {
	const x = useMotionValue(-100)
	const y = useMotionValue(-100)
	const scale = useMotionValue(1)
	const opacity = useMotionValue(0)

	const springX = useSpring(x, { damping: 25, stiffness: 200, mass: 0.5 })
	const springY = useSpring(y, { damping: 25, stiffness: 200, mass: 0.5 })
	const springScale = useSpring(scale, { damping: 20, stiffness: 350 })

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (window.matchMedia('(pointer: coarse)').matches) return

		const onMove = (e: MouseEvent) => {
			x.set(e.clientX)
			y.set(e.clientY)
			opacity.set(0.9)
		}
		const onLeave = () => opacity.set(0)
		const onOver = (e: MouseEvent) => {
			const hovering = Boolean(
				(e.target as HTMLElement).closest('a, button, [data-cursor-hover]'),
			)
			scale.set(hovering ? 1.6 : 1)
		}

		window.addEventListener('mousemove', onMove, { passive: true })
		window.addEventListener('mouseleave', onLeave)
		window.addEventListener('mouseover', onOver, { passive: true })

		return () => {
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseleave', onLeave)
			window.removeEventListener('mouseover', onOver)
		}
	}, [x, y, scale, opacity])

	return (
		<motion.div
			aria-hidden
			className="pointer-events-none fixed left-0 top-0 z-[100] hidden md:block"
			style={{
				x: springX,
				y: springY,
				translateX: '-50%',
				translateY: '-50%',
				scale: springScale,
				opacity,
			}}
		>
			<div className="size-3 rounded-full bg-primary mix-blend-difference" />
		</motion.div>
	)
}
