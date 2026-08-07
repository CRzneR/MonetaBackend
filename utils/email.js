
// utils/email.js
// Zentrale Stelle für den E-Mail-Versand über Resend.
// Setup: `npm install resend`, dann in Render als Environment Variables setzen:
//   RESEND_API_KEY = dein Resend API Key
//   EMAIL_FROM     = z.B. "BilanzBalance <no-reply@bilanzbalance.de>"
//   FRONTEND_URL   = z.B. "https://bilanzbalance.de"
// Die Absender-Domain (bilanzbalance.de) muss im Resend-Dashboard einmalig
// per DNS-Eintrag verifiziert werden, sonst können nur Test-Adressen genutzt werden.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "BilanzBalance <no-reply@bilanzbalance.de>";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://bilanzbalance.de";

export async function sendVerificationEmail(to, token) {
  const link = `${process.env.BACKEND_URL || "https://monetabackend-1.onrender.com"}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Bestätige deine E-Mail-Adresse – BilanzBalance",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #10b981;">Willkommen bei BilanzBalance!</h2>
        <p>Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren:</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
            E-Mail bestätigen
          </a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
          <a href="${link}">${link}</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">Dieser Link ist 24 Stunden gültig.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to, token) {
  const link = `${FRONTEND_URL}/pages/reset-password.html?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Passwort zurücksetzen – BilanzBalance",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #10b981;">Passwort zurücksetzen</h2>
        <p>Du hast angefragt, dein Passwort zurückzusetzen. Klicke auf den Button, um ein neues Passwort zu vergeben:</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
            Neues Passwort vergeben
          </a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
          <a href="${link}">${link}</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          Dieser Link ist 1 Stunde gültig. Falls du das nicht angefragt hast, kannst du diese E-Mail ignorieren.
        </p>
      </div>
    `,
  });
}
