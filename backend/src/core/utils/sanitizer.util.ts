/**
 * Input Sanitization Utilities
 * Provides protection against XSS and other injection attacks
 */

const HTML_ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;',
	'`': '&#x60;',
	'=': '&#x3D;',
};

const DANGEROUS_PATTERNS = [
	/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	/javascript:/gi,
	/on\w+\s*=/gi,
	/data:/gi,
	/vbscript:/gi,
	/expression\s*\(/gi,
];

export function escapeHtml(str: string): string {
	if (typeof str !== 'string') return str;
	return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

export function stripHtmlTags(str: string): string {
	if (typeof str !== 'string') return str;
	return str.replace(/<[^>]*>/g, '');
}

export function sanitizeInput(input: string): string {
	if (typeof input !== 'string') return input;

	let sanitized = input;

	for (const pattern of DANGEROUS_PATTERNS) {
		sanitized = sanitized.replace(pattern, '');
	}

	sanitized = escapeHtml(sanitized);

	return sanitized.trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(
	obj: T,
	fieldsToSanitize: string[] = [],
): T {
	const sanitized = { ...obj };

	for (const key of Object.keys(sanitized)) {
		const value = sanitized[key];

		if (fieldsToSanitize.length > 0 && !fieldsToSanitize.includes(key)) {
			continue;
		}

		if (typeof value === 'string') {
			(sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
		} else if (
			value &&
			typeof value === 'object' &&
			!Array.isArray(value)
		) {
			(sanitized as Record<string, unknown>)[key] = sanitizeObject(
				value as Record<string, unknown>,
				fieldsToSanitize,
			);
		}
	}

	return sanitized;
}

export function sanitizeUsername(username: string): string {
	if (typeof username !== 'string') return username;
	return username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

export function sanitizeEmail(email: string): string {
	if (typeof email !== 'string') return email;
	return email.toLowerCase().trim();
}

export function isValidUUID(str: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(str);
}

export function isValidCUID(str: string): boolean {
	const cuidRegex = /^c[a-z0-9]{24,}$/;
	return cuidRegex.test(str);
}
