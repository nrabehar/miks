import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * A subtle cursor follower — a soft glowing dot that lags behind the real
 * cursor, and grows when hovering over interactive elements with
 * `[data-cursor-hover]`.
 */
export const CursorFollower = () => {
	const x = useMotionValue(-100)
	const y = useMotionValue(-100)
	const springX = useSpring(x, { damping: 25, stiffness: 200, mass: 0.5 })
	const springY = useSpring(y, { damping: 25, stiffness: 200, mass: 0.5 })
	const [hovering, setHovering] = useState(false)
	const [hidden, setHidden] = useState(true)

	useEffect(() => {
		// Don't run on touch devices
		if (typeof window === 'undefined') return
		if (window.matchMedia('(pointer: coarse)').matches) return

		const move = (e: MouseEvent) => {
			x.set(e.clientX)
			y.set(e.clientY)
			setHidden(false)
		}
		const leave = () => setHidden(true)

		const onOver = (e: MouseEvent) => {
			const target = e.target as HTMLElement
			setHovering(Boolean(target.closest('a, button, [data-cursor-hover]')))
		}

		window.addEventListener('mousemove', move)
		window.addEventListener('mouseleave', leave)
		window.addEventListener('mouseover', onOver)

		return () => {
			window.removeEventListener('mousemove', move)
			window.removeEventListener('mouseleave', leave)
			window.removeEventListener('mouseover', onOver)
		}
	}, [x, y])

	return (
		<motion.div
			aria-hidden
			className="pointer-events-none fixed left-0 top-0 z-[100] hidden md:block"
			style={{
				x: springX,
				y: springY,
				translateX: '-50%',
				translateY: '-50%',
			}}
		>
			<motion.div
				animate={{
					scale: hovering ? 1.6 : 1,
					opacity: hidden ? 0 : 0.9,
				}}
				transition={{ duration: 0.2 }}
				className="size-3 rounded-full bg-primary mix-blend-difference"
			/>
		</motion.div>
	)
}