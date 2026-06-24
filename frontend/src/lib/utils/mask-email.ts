export function maskEmail(email: string): string {
	if (!email) return ''
	const [name, domain] = email.split('@')
	if (!domain) return ''
	const masked =
		name.length > 2
			? `${name[0]}${'•'.repeat(name.length - 2)}${name[name.length - 1]}`
			: name
	return `${masked}@${domain}`
}
