import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useCooldown } from "./use-cooldown"

describe("useCooldown", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("starts inactive with zero seconds remaining", () => {
		const { result } = renderHook(() => useCooldown())

		expect(result.current.active).toBe(false)
		expect(result.current.remaining).toBe(0)
	})

	it("becomes active and counts down once started", () => {
		const { result } = renderHook(() => useCooldown())

		act(() => {
			result.current.start(3)
		})
		expect(result.current.active).toBe(true)
		expect(result.current.remaining).toBe(3)

		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(result.current.remaining).toBe(2)
	})

	it("becomes inactive again once the countdown reaches zero", () => {
		const { result } = renderHook(() => useCooldown())

		act(() => {
			result.current.start(2)
		})

		act(() => {
			vi.advanceTimersByTime(2000)
		})

		expect(result.current.remaining).toBe(0)
		expect(result.current.active).toBe(false)
	})

	it("restarting resets the countdown instead of stacking two intervals", () => {
		const { result } = renderHook(() => useCooldown())

		act(() => {
			result.current.start(5)
		})
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(result.current.remaining).toBe(4)

		act(() => {
			result.current.start(10)
		})
		expect(result.current.remaining).toBe(10)

		act(() => {
			vi.advanceTimersByTime(1000)
		})
		// A stray first interval would double-decrement this to 8.
		expect(result.current.remaining).toBe(9)
	})

	it("clears its interval on unmount without throwing", () => {
		const { result, unmount } = renderHook(() => useCooldown())

		act(() => {
			result.current.start(5)
		})

		expect(() => unmount()).not.toThrow()
		expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
	})
})
