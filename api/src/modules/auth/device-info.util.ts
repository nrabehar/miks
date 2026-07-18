import { DeviceType } from '$prisma/enums';
import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
	type: DeviceType;
	platform: string | null;
	deviceName: string | null;
}

export function parseDeviceInfo(userAgent: string | undefined): DeviceInfo {
	if (!userAgent) {
		return { type: DeviceType.OTHER, platform: null, deviceName: null };
	}

	const { device, os, browser } = UAParser(userAgent);

	const type =
		device.type === 'mobile'
			? DeviceType.MOBILE
			: device.type === 'tablet'
				? DeviceType.TABLET
				: DeviceType.WEB;

	const platform = os.name
		? [os.name, os.version].filter(Boolean).join(' ')
		: null;

	const deviceName = browser.name
		? [browser.name, os.name ? `on ${os.name}` : null]
				.filter(Boolean)
				.join(' ')
		: (device.vendor ?? device.model ?? null);

	return { type, platform, deviceName };
}
