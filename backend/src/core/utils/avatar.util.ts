export const buildAvatarSvg = (seed: string): Buffer => {
	const palette: [string, string][] = [
		['#b6e3f4', '#4a9eba'],
		['#c0aede', '#7c5cbf'],
		['#d1f4d1', '#4caf50'],
		['#ffdfbf', '#e07b39'],
		['#ffd5dc', '#d64d6a'],
		['#c8e6c9', '#388e3c'],
		['#bbdefb', '#1976d2'],
		['#f8bbd9', '#c2185b'],
		['#fff9c4', '#f9a825'],
		['#e8d5ff', '#8e24aa'],
	];

	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = seed.charCodeAt(i) + ((hash << 5) - hash);
		hash |= 0;
	}
	const [bg, fg] = palette[Math.abs(hash) % palette.length];
	const letter = seed.charAt(0).toUpperCase();

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">` +
		`<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">` +
		`<stop offset="0%" stop-color="${bg}"/>` +
		`<stop offset="100%" stop-color="${fg}"/>` +
		`</linearGradient></defs>` +
		`<circle cx="64" cy="64" r="64" fill="url(#g)"/>` +
		`<text x="64" y="64" dy="0.35em" text-anchor="middle" fill="white"` +
		` font-family="system-ui,sans-serif" font-size="56" font-weight="600">${letter}</text>` +
		`</svg>`;

	return Buffer.from(svg, 'utf-8');
};
