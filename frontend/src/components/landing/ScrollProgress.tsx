import { motion, useScroll, useSpring } from 'framer-motion'

/**
 * Top-of-page scroll progress bar — scales X from 0 to 1 as the user
 * scrolls through the page.
 */
export const ScrollProgress = () => {
	const { scrollXProgress } = useScroll()
	const scaleX = useSpring(scrollXProgress, {
		damping: 25,
		stiffness: 120,
		mass: 0.3,
	})

	return (
		<motion.div
			className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-primary/60 via-primary to-primary/60"
			style={{ scaleX }}
		/>
	)
}