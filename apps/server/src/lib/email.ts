import { config } from './config';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Send a password-reset code email via the Resend HTTP API.
 * If RESEND_API_KEY is not configured (dev/test), logs the code instead of
 * sending so local flows still work without email infrastructure.
 */
export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  if (!config.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn(`[email] RESEND_API_KEY not set — reset code for ${to}: ${code}`);
    return;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to,
      subject: 'Your Local Legend password reset code',
      text: `Your password reset code is ${code}. It expires in 15 minutes. If you didn't request this, ignore this email.`,
      html: `<p>Your password reset code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
}
