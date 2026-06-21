/**
 * Extract error message from an unknown error type
 * This is a type-safe way to get error messages
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return 'An unexpected error occurred';
}

/**
 * Extract error stack from an unknown error type
 * Returns undefined if not available
 */
export function getErrorStack(error: unknown): string | undefined {
	if (error instanceof Error) {
		return error.stack;
	}
	return undefined;
}

/**
 * Check if an error is an instance of a specific error class
 */
export function isErrorInstance<T extends Error>(
	error: unknown,
	errorClass: new (...args: never[]) => T,
): error is T {
	return error instanceof errorClass;
}
