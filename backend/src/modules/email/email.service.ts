import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service.js';

const BRAND = {
  navy: '#0C1124',
  navyCard: '#131d35',
  blue: '#3D6BE4',
  orange: '#F5751C',
  green: '#10B981',
  body: '#F2F5FF',
  card: '#ffffff',
  border: '#dde4f8',
  textDark: '#0C1124',
  textMid: '#3a4560',
  textMuted: '#8892b0',
  textTiny: '#bbc4d8',
  warnBg: '#fff8f2',
  warnBorder: '#fde4c8',
  warnText: '#c45a0a',
  infoBg: '#edf2ff',
};

@Injectable()
export class EmailService {
  constructor(private readonly mail: MailService) {}

  async sendVerificationCode(to: string, name: string, code: string) {
    await this.mail.send(
      to,
      'Vérification de votre adresse email — MIKS',
      this.verificationTemplate(name, code),
    );
  }

  async sendPasswordReset(to: string, name: string, userId: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const link = `${frontendUrl}/auth/reset-password?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
    await this.mail.send(
      to,
      'Réinitialisation de mot de passe — MIKS',
      this.passwordResetTemplate(name, link),
    );
  }

  // ─── Private template builders ─────────────────────────────────────

  private verificationTemplate(name: string, code: string): string {
    return this.base(`
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${BRAND.green};letter-spacing:.1em;text-transform:uppercase;margin:0 0 16px 0">Sécurité du compte</p>

      <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:${BRAND.textDark};letter-spacing:-.02em;line-height:1.2;margin:0 0 14px 0">Confirmez votre adresse&nbsp;email</h1>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${BRAND.textMid};line-height:1.65;margin:0 0 32px 0">
        Bonjour <strong style="color:${BRAND.textDark}">${this.esc(name)}</strong>,<br>
        Utilisez le code ci-dessous pour vérifier votre adresse email. Ce code est valable pendant <strong>15&nbsp;minutes</strong>.
      </p>

      <!-- OTP token -->
      <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 28px auto">
        <tr>
          <td style="background:${BRAND.navy};border-radius:10px;padding:5px">
            <table cellpadding="0" cellspacing="0">
              <tr>
                ${this.otpCells(code)}
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Expiry notice -->
      <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 36px auto">
        <tr>
          <td style="background:${BRAND.warnBg};border:1px solid ${BRAND.warnBorder};border-radius:6px;padding:10px 20px">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.warnText};font-weight:600">&#x23F1;&nbsp; Expire dans 15 minutes</span>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0"><tr><td style="height:1px;background:#edf0f8;font-size:0;line-height:0">&nbsp;</td></tr></table>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.textMuted};line-height:1.6;margin:0">
        Si vous n'avez pas créé de compte sur MIKS, vous pouvez ignorer cet email en toute sécurité.
      </p>
    `);
  }

  private passwordResetTemplate(name: string, link: string): string {
    return this.base(`
      <!-- Icon -->
      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0">
        <tr>
          <td style="background:${BRAND.infoBg};border-radius:10px;width:52px;height:52px;text-align:center;vertical-align:middle">
            <span style="font-size:24px;line-height:52px;display:block">&#x1F511;</span>
          </td>
        </tr>
      </table>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${BRAND.blue};letter-spacing:.1em;text-transform:uppercase;margin:0 0 16px 0">Sécurité du compte</p>

      <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:${BRAND.textDark};letter-spacing:-.02em;line-height:1.2;margin:0 0 14px 0">Réinitialisez votre mot&nbsp;de&nbsp;passe</h1>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${BRAND.textMid};line-height:1.65;margin:0 0 32px 0">
        Bonjour <strong style="color:${BRAND.textDark}">${this.esc(name)}</strong>,<br>
        Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
      </p>

      <!-- CTA button -->
      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0">
        <tr>
          <td style="background:${BRAND.blue};border-radius:8px">
            <a href="${link}" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;padding:15px 36px;letter-spacing:-.01em">
              Réinitialiser mon mot de passe &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- Expiry notice -->
      <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0">
        <tr>
          <td style="background:${BRAND.warnBg};border:1px solid ${BRAND.warnBorder};border-radius:6px;padding:10px 20px">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.warnText};font-weight:600">&#x23F1;&nbsp; Ce lien expire dans 1 heure</span>
          </td>
        </tr>
      </table>

      <!-- Fallback link label -->
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 10px 0">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:
      </p>

      <!-- Fallback link box -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 36px 0">
        <tr>
          <td style="background:${BRAND.body};border:1px solid ${BRAND.border};border-radius:6px;padding:12px 16px;word-break:break-all">
            <a href="${link}" style="font-family:'Courier New',Courier,monospace;font-size:12px;color:${BRAND.blue};text-decoration:none">${this.esc(link)}</a>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0"><tr><td style="height:1px;background:#edf0f8;font-size:0;line-height:0">&nbsp;</td></tr></table>

      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.textMuted};line-height:1.6;margin:0">
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.
      </p>
    `);
  }

  /** Wrap content in the MIKS email shell (header + card + footer). */
  private base(content: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>MIKS</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.body};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.body}">
    <tr>
      <td align="center" style="padding:40px 16px 32px">

        <!-- Email card (max 600px) -->
        <table cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">

          <!-- ── Header ────────────────────────────── -->
          <tr>
            <td style="background-color:${BRAND.navy};border-radius:12px 12px 0 0;padding:22px 36px">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle">
                    ${this.logoSvg()}
                  </td>
                  <td style="vertical-align:middle">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.02em">MIKS</span>
                  </td>
                  <td style="vertical-align:middle;padding-left:14px">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;color:${BRAND.textMuted};letter-spacing:.08em;text-transform:uppercase">Épargne collective</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Accent strip ──────────────────────── -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,${BRAND.green} 0%,${BRAND.blue} 45%,${BRAND.orange} 100%);font-size:0;line-height:0">&nbsp;</td>
          </tr>

          <!-- ── Card body ─────────────────────────── -->
          <tr>
            <td style="background-color:${BRAND.card};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 12px 12px;padding:40px 36px 36px">
              ${content}
            </td>
          </tr>

        </table>

        <!-- ── Footer ───────────────────────────────── -->
        <table cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin-top:24px">
          <tr>
            <td style="text-align:center;padding:0 24px">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.textMuted};line-height:1.8;margin:0">
                MIKS &middot; Épargne collective, gérée ensemble<br>
                <span style="color:${BRAND.textTiny}">Cet email a été envoyé automatiquement &mdash; merci de ne pas y répondre.</span><br>
                <a href="#" style="color:${BRAND.blue};text-decoration:none;font-size:12px">Aide</a>
                &nbsp;&middot;&nbsp;
                <a href="#" style="color:${BRAND.blue};text-decoration:none;font-size:12px">Confidentialité</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /** Render OTP code as individual digit cells. Splits at midpoint with a centred dot separator. */
  private otpCells(code: string): string {
    const CELL = (d: string) =>
      `<td style="background:${BRAND.navyCard};border-radius:6px;width:48px;height:60px;text-align:center;vertical-align:middle">` +
      `<span style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;color:${BRAND.orange};display:block;line-height:60px">${this.esc(d)}</span>` +
      `</td>`;
    const SPACE = `<td width="4"></td>`;
    const DOT = `<td width="14" style="text-align:center;vertical-align:middle">` +
      `<span style="font-family:'Courier New',Courier,monospace;font-size:20px;color:#3a4a6a;font-weight:700">&middot;</span>` +
      `</td>`;

    const chars = code.split('');
    const mid = Math.ceil(chars.length / 2);
    const left = chars.slice(0, mid);
    const right = chars.slice(mid);

    const leftCells = left.map((d, i) => CELL(d) + (i < left.length - 1 ? SPACE : '')).join('');
    const rightCells = right.map((d, i) => (i > 0 ? SPACE : '') + CELL(d)).join('');

    return leftCells + DOT + rightCells;
  }

  /** MIKS three-wing SVG logo (32×23px, coloured — supported in Gmail, Apple Mail, Outlook.com). */
  private logoSvg(): string {
    return `<svg viewBox="0 0 1024 719" width="32" height="23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="MIKS logo">
  <path d="M461.457 648.542L291.306 380.079L514.513 370.833H726.808L564.71 646.797C541.788 685.821 485.685 686.769 461.457 648.542Z" fill="url(#ml0)"/>
  <path d="M167.279 64.3638L4.24689 601.036C-22.9616 690.601 86.8745 757.672 154.158 692.578L371.177 482.622L512 372.094L333.64 47.092C294.995 -23.3255 190.626 -12.4897 167.279 64.3638Z" fill="url(#ml1)"/>
  <path d="M856.721 64.7841L1019.75 601.456C1046.96 691.021 937.126 758.092 869.842 692.998L652.823 483.042L512 372.514L690.36 47.5122C729.005 -22.9052 833.374 -12.0694 856.721 64.7841Z" fill="url(#ml2)"/>
  <defs>
    <radialGradient id="ml0" cx="0" cy="0" r="1" gradientTransform="matrix(-6.3055 180.71 -510.977 -17.82 514.942 370.833)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5E3010"/><stop offset="1" stop-color="#F5751C"/>
    </radialGradient>
    <linearGradient id="ml1" x1="601.959" y1="-181.804" x2="74.1733" y2="630.68" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10B981"/><stop offset="1" stop-color="#234ABA"/>
    </linearGradient>
    <linearGradient id="ml2" x1="564.126" y1="-62.0311" x2="961.633" y2="647.452" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1E3A8A"/><stop offset="1" stop-color="#10B981"/>
    </linearGradient>
  </defs>
</svg>`;
  }

  /** HTML-escape user-supplied strings to prevent injection into email HTML. */
  private esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
