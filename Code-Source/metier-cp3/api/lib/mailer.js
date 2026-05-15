import 'dotenv/config';
import nodemailer from 'nodemailer';

// ============================================================
// SERVICE EMAIL — Nodemailer
// ============================================================
//
// 🍽️ Analogie : c'est le système de courrier du restaurant.
// On configure une seule fois l'adresse de l'expéditeur,
// puis on envoie des lettres (emails) aux clients quand nécessaire.
//
// Deux modes :
//   - DEV  : Mailtrap (les emails sont capturés, jamais envoyés)
//   - PROD : Brevo/Sendinblue (300 emails/jour gratuit)
//
// Configuration via .env :
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// ============================================================

// Transporter unique — lit les variables SMTP_*
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Wrapper HTML commun ────────────────────────────────────
// Analogie : une enveloppe identique pour tous les courriers
// du restaurant. Seul le contenu change.
function wrapHtml(content) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                background: #FAF7F2; padding: 32px; border-radius: 8px;">

      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #8E1F2F; font-size: 24px; margin: 0;">
          🎬 Cinés Délices
        </h1>
      </div>

      ${content}

      <hr style="border: none; border-top: 1px solid #E0DDD5; margin: 24px 0;" />

      <p style="color: #888; font-size: 12px; line-height: 1.5;">
        Cet email a été envoyé automatiquement par Cinés Délices.
        Pour toute question, consultez nos
        <a href="${CLIENT_URL}/mentions-legales" style="color: #C9A45C;">
          mentions légales
        </a>
        ou notre
        <a href="${CLIENT_URL}/politique-confidentialite" style="color: #C9A45C;">
          politique de confidentialité
        </a>.
      </p>
    </div>
  `;
}

// ── Bouton réutilisable ────────────────────────────────────
function btn(label, href) {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}"
         style="background: #8E1F2F; color: #FAF7F2; padding: 14px 28px;
                text-decoration: none; border-radius: 6px; font-weight: bold;
                display: inline-block;">
        ${label}
      </a>
    </div>
  `;
}

// ── Reset MDP ──────────────────────────────────────────────
export async function sendResetPasswordMail(to, resetLink) {
  return sendEmail({
    to,
    subject: 'Cinés Délices — Réinitialisation de votre mot de passe',
    html: wrapHtml(`
      <h2 style="color: #2C2C2A; font-size: 18px;">
        Réinitialisation de votre mot de passe
      </h2>

      <p style="color: #444; line-height: 1.6;">
        Vous avez demandé à réinitialiser votre mot de passe sur
        <strong>Cinés Délices</strong>.
      </p>

      <p style="color: #444; line-height: 1.6;">
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        Ce lien est valable <strong>1 heure</strong>.
      </p>

      ${btn('Réinitialiser mon mot de passe', resetLink)}

      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        Si vous n'avez pas fait cette demande, ignorez cet email —
        votre mot de passe restera inchangé.
      </p>

      <p style="color: #888; font-size: 12px; word-break: break-all;">
        Lien alternatif : <a href="${resetLink}" style="color: #C9A45C;">${resetLink}</a>
      </p>
    `),
  });
}

// ── Confirmation changement MDP ────────────────────────────
export async function sendPasswordChangedMail(to) {
  return sendEmail({
    to,
    subject: 'Cinés Délices — Votre mot de passe a été modifié',
    html: wrapHtml(`
      <h2 style="color: #2C2C2A; font-size: 18px;">
        Mot de passe modifié avec succès
      </h2>

      <p style="color: #444; line-height: 1.6;">
        Votre mot de passe <strong>Cinés Délices</strong> a bien été modifié.
      </p>

      <p style="color: #444; line-height: 1.6;">
        Si vous n'êtes pas à l'origine de cette modification,
        contactez-nous immédiatement via le formulaire de contact.
      </p>

      ${btn('Accéder à mon compte', `${CLIENT_URL}/login`)}
    `),
  });
}

// ── Fonction générique ─────────────────────────────────────
// Utilisée par toutes les fonctions ci-dessus ET par le CRON
export async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn(`[MAILER] SMTP non configuré — email ignoré : "${subject}" → ${to}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Cinés Délices" <noreply@cines-delices.fr>',
      to,
      subject,
      html,
    });
    console.log(`[MAILER] ✅ Email envoyé à ${to} : "${subject}" (${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[MAILER] ❌ Erreur envoi à ${to} :`, error.message);
    return false;
  }
}

// ── Vérification SMTP au démarrage ─────────────────────────
export async function verifyMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[MAILER] SMTP non configuré — envoi désactivé');
    return false;
  }

  try {
    await transporter.verify();
    console.log('[MAILER] ✅ Connexion SMTP vérifiée');
    return true;
  } catch (error) {
    console.error('[MAILER] ❌ Connexion SMTP échouée :', error.message);
    return false;
  }
}

export default transporter;
