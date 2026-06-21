import {
	Injectable,
	InternalServerErrorException,
	Logger,
	OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import handlebars from 'handlebars';
import path from 'path';
import { Resend } from 'resend';
import { VerificationMailPayload } from './types/verification.type';

@Injectable()
export class MailService implements OnModuleInit {
	private logger = new Logger(MailService.name);

	private resend: Resend;
	private i18nData: Record<string, any> = {};

	constructor(private readonly configService: ConfigService) {
		const apiKey = this.configService.get<string>('email.apiKey');
		if (!apiKey)
			throw new Error(
				'Resend API key is not defined in environment variables',
			);
		this.resend = new Resend(apiKey);
	}

	onModuleInit() {
		this.loadTranslations();
		this.registerPartials();
		this.registerHelpers();
	}

	async sendEmail(
		to: string,
		templateName: string,
		subjectKey: string,
		context: Record<string, any> & { lang: string; sender?: string },
	) {
		try {
			const templatePath = path.join(
				__dirname,
				'templates',
				`${templateName}.hbs`,
			);
			const source = fs.readFileSync(templatePath, 'utf8');
			const template = handlebars.compile(source);

			const html = template(context);

			let subject = subjectKey;
			const langData = this.i18nData[context.lang] || this.i18nData['fr'];
			const subjectKeys = subjectKey.split('.');
			let currentSubjectLevel = langData;

			for (const k of subjectKeys) {
				if (currentSubjectLevel && currentSubjectLevel[k]) {
					currentSubjectLevel = currentSubjectLevel[k];
				} else {
					currentSubjectLevel = null;
					break;
				}
			}

			if (typeof currentSubjectLevel === 'string')
				subject = currentSubjectLevel;

			const { data, error } = await this.resend.emails.send({
				from: 'Miks Coopérative <hello@miks.dedyn.io>',
				to,
				subject,
				html,
			});

			if (error) throw new Error(error.message);
			return data;

			return data;
		} catch (error) {
			this.logger.error(
				`Failed to send email to ${to}`,
				error instanceof Error ? error.stack : undefined,
			);
			throw new InternalServerErrorException(
				'Failed to send email, please try again later',
			);
		}
	}

	async sendVerificationCode(payload: VerificationMailPayload & { lang: string }) {
		const contextKey = payload.context;
		
		const expirationTime = payload.expirationTime || '15 min';
	  
		await this.sendEmail(
		  payload.to,
		  'confirmation',
		  `subjects.${contextKey}`,
		  {
			lang: payload.lang,
			name: payload.name,
			code: payload.code,
			extraDetails: payload.extraDetails,
			expirationTime,
			subjectKey: `subjects.${contextKey}`,
			titleKey: `confirmation.${contextKey}_TITLE`,
			descKey: `confirmation.${contextKey}_DESC`,
		  }
		);
	  }

	private registerPartials() {
		const partialsDir = path.join(__dirname, 'templates', 'partials');

		if (!fs.existsSync(partialsDir)) return;

		const filenames = fs.readdirSync(partialsDir);

		filenames.forEach((filename) => {
			const matches = /^([^.]+).hbs$/.exec(filename);
			if (!matches) return;

			const partialName = matches[1];
			const templatePath = path.join(partialsDir, filename);
			const templateContent = fs.readFileSync(templatePath, 'utf8');

			// Enregistrement global dans Handlebars
			handlebars.registerPartial(partialName, templateContent);
		});
	}

	private loadTranslations() {
		const i18nDir = path.join(__dirname, 'i18n');
		if (!fs.existsSync(i18nDir)) return;

		fs.readdirSync(i18nDir).forEach((file) => {
			const matches = /^([^.]+).json$/.exec(file);
			if (matches) {
				const lang = matches[1]; // 'fr', 'en'
				const content = fs.readFileSync(
					path.join(i18nDir, file),
					'utf8',
				);
				this.i18nData[lang] = JSON.parse(content);
			}
		});
	}

	private registerHelpers() {
		handlebars.registerHelper('t', (key: string, options: any) => {
			const lang = options.data.root.lang || 'fr';

			const keys = key.split('.');
			let translation = this.i18nData[lang] || this.i18nData['fr'];

			for (const k of keys) {
				if (!translation || !translation[k]) return key;
				translation = translation[k];
			}

			let interpolated = translation as string;

			if (options.hash) {
				Object.entries(options.hash).forEach(([k, v]) => {
					interpolated = interpolated.replace(
						new RegExp(`{${k}}`, 'g'),
						String(v),
					);
				});
			}

			return new handlebars.SafeString(interpolated);
		});
	}
}
