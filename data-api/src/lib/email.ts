// Password-reset email via Resend (https://resend.com). If RESEND_API_KEY is not
// configured, nothing is sent — the token is NEVER returned to the caller.

import type { Env } from '../worker'

export async function sendResetEmail(env: Env, to: string, link: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('[reset] RESEND_API_KEY not set; reset email not sent')
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'MomEase <noreply@mease.mom>',
      to: [to],
      subject: 'Reset your MomEase password',
      html:
        `<p>Hi there,</p><p>Use the link below to choose a new password. It expires in 30 minutes.</p>` +
        `<p><a href="${link}">Reset my password</a></p>` +
        `<p>If you didn't ask for this, you can ignore this email.</p>`,
    }),
  })
  if (!res.ok) console.warn('[reset] Resend failed', res.status)
  return res.ok
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
