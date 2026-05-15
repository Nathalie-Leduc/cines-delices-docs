import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/mailer.js';

// ============================================================
// CRON — Vérification d'inactivité des comptes (RGPD)
// ============================================================
//
// 🍽️ Analogie : chaque semaine, le gérant du restaurant
// vérifie son registre de clients fidèles :
//
//   1. Client pas venu depuis 11 mois ?
//      → On lui envoie un courrier : "Ça fait longtemps !
//        Votre carte de fidélité expire dans 30 jours."
//
//   2. Client pas venu depuis 12 mois (et déjà prévenu) ?
//      → On archive sa carte (suppression du compte).
//        Ses recettes publiées restent au menu avec
//        la mention "Recette d'un ancien chef".
//
// Calendrier RGPD (recommandation CNIL) :
//   - 11 mois sans connexion → email de prévenance
//   - 12 mois sans connexion → suppression/anonymisation
//
// Planification : chaque lundi à 3h du matin
//   Syntaxe cron : '0 3 * * 1'
//   minute=0, heure=3, jour=*, mois=*, jour-semaine=1(lundi)
// ============================================================

// Délais en millisecondes
const ELEVEN_MONTHS_MS = 11 * 30 * 24 * 60 * 60 * 1000;
const TWELVE_MONTHS_MS = 12 * 30 * 24 * 60 * 60 * 1000;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─────────────────────────────────────────────
// Template email : prévenance (11 mois)
// ─────────────────────────────────────────────
function buildWarningEmail(user) {
  return {
    to: user.email,
    subject: 'Cinés Délices — Votre compte sera bientôt supprimé',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                  background: #FAF7F2; padding: 32px; border-radius: 8px;">

        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #8E1F2F; font-size: 24px; margin: 0;">
            🎬 Cinés Délices
          </h1>
        </div>

        <h2 style="color: #2C2C2A; font-size: 18px;">
          Bonjour ${user.pseudo},
        </h2>

        <p style="color: #444; line-height: 1.6;">
          Nous constatons que vous ne vous êtes pas connecté(e) à
          <strong>Cinés Délices</strong> depuis plus de 11 mois.
        </p>

        <p style="color: #444; line-height: 1.6;">
          Conformément à notre politique de protection des données personnelles
          (RGPD) et aux recommandations de la CNIL, <strong>votre compte sera
          automatiquement supprimé dans 30 jours</strong> si vous ne vous
          reconnectez pas.
        </p>

        <p style="color: #444; line-height: 1.6;">
          Vos recettes publiées resteront visibles de manière anonyme
          sur le site.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${CLIENT_URL}/login"
             style="background: #8E1F2F; color: #FAF7F2; padding: 14px 28px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;
                    display: inline-block;">
            Me reconnecter
          </a>
        </div>

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
    `,
  };
}

// ─────────────────────────────────────────────
// Template email : confirmation de suppression
// ─────────────────────────────────────────────
function buildDeletionEmail(user) {
  return {
    to: user.email,
    subject: 'Cinés Délices — Votre compte a été supprimé',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                  background: #FAF7F2; padding: 32px; border-radius: 8px;">

        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #8E1F2F; font-size: 24px; margin: 0;">
            🎬 Cinés Délices
          </h1>
        </div>

        <h2 style="color: #2C2C2A; font-size: 18px;">
          Bonjour ${user.pseudo},
        </h2>

        <p style="color: #444; line-height: 1.6;">
          Suite à une inactivité de plus de 12 mois et conformément
          à notre politique de protection des données (RGPD),
          <strong>votre compte Cinés Délices a été supprimé</strong>.
        </p>

        <p style="color: #444; line-height: 1.6;">
          Vos données personnelles (email, pseudo, mot de passe)
          ont été définitivement effacées. Vos recettes publiées
          restent visibles de manière anonyme.
        </p>

        <p style="color: #444; line-height: 1.6;">
          Vous pouvez à tout moment créer un nouveau compte sur
          <a href="${CLIENT_URL}/signup" style="color: #C9A45C;">
            Cinés Délices
          </a>.
        </p>

        <hr style="border: none; border-top: 1px solid #E0DDD5; margin: 24px 0;" />

        <p style="color: #888; font-size: 12px; line-height: 1.5;">
          Cet email a été envoyé automatiquement. Vous ne recevrez
          plus de communications de notre part.
        </p>
      </div>
    `,
  };
}

// ─────────────────────────────────────────────
// Suppression d'un compte inactif
// ─────────────────────────────────────────────
// Même logique que deleteUser dans adminController :
//   - Supprime les recettes DRAFT/PENDING
//   - Le User est supprimé → SetNull sur les PUBLISHED
//   - Envoie un email de confirmation avant suppression
async function purgeInactiveAccount(user) {
  // Envoyer l'email AVANT la suppression (on a encore l'adresse)
  await sendEmail(buildDeletionEmail(user));

  await prisma.$transaction(async (tx) => {
    await tx.recipe.deleteMany({
      where: {
        userId: user.id,
        status: { in: ['DRAFT', 'PENDING'] },
      },
    });

    await tx.user.delete({ where: { id: user.id } });
  });

  console.log(`[CRON] Compte inactif supprimé : ${user.pseudo} (${user.email})`);
}

// ─────────────────────────────────────────────
// Job principal
// ─────────────────────────────────────────────
async function checkInactiveAccounts() {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() - ELEVEN_MONTHS_MS);
  const purgeThreshold = new Date(now.getTime() - TWELVE_MONTHS_MS);

  console.log(`[CRON] Vérification des comptes inactifs — ${now.toISOString()}`);

  // ── 1. Comptes à supprimer (12+ mois) ──
  // On cherche les MEMBERS (jamais les admins) qui ne se sont
  // pas connectés depuis plus de 12 mois.
  // On inclut aussi les comptes qui n'ont JAMAIS eu de lastLoginAt
  // ET dont la création date de plus de 12 mois (comptes créés
  // avant la mise en place du tracking).
  const accountsToPurge = await prisma.user.findMany({
    where: {
      role: 'MEMBER',
      OR: [
        // Cas 1 : lastLoginAt existe et date de plus de 12 mois
        { lastLoginAt: { lt: purgeThreshold } },
        // Cas 2 : jamais connecté + compte créé il y a plus de 12 mois
        { lastLoginAt: null, createdAt: { lt: purgeThreshold } },
      ],
    },
  });

  for (const user of accountsToPurge) {
    try {
      await purgeInactiveAccount(user);
    } catch (error) {
      console.error(`[CRON] Erreur suppression ${user.pseudo} :`, error.message);
    }
  }

  // ── 2. Comptes à prévenir (11-12 mois) ──
  const accountsToWarn = await prisma.user.findMany({
    where: {
      role: 'MEMBER',
      OR: [
        // Cas 1 : lastLoginAt entre 11 et 12 mois
        {
          lastLoginAt: {
            gte: purgeThreshold,
            lt: warningThreshold,
          },
        },
        // Cas 2 : jamais connecté + compte créé entre 11 et 12 mois
        {
          lastLoginAt: null,
          createdAt: {
            gte: purgeThreshold,
            lt: warningThreshold,
          },
        },
      ],
    },
  });

  for (const user of accountsToWarn) {
    try {
      await sendEmail(buildWarningEmail(user));
      console.log(`[CRON] Email de prévenance envoyé à ${user.pseudo} (${user.email})`);
    } catch (error) {
      console.error(`[CRON] Erreur envoi email ${user.pseudo} :`, error.message);
    }
  }

  console.log(
    `[CRON] Résultat : ${accountsToPurge.length} supprimé(s), ${accountsToWarn.length} prévenu(s)`
  );
}

// ─────────────────────────────────────────────
// Démarrage du cron
// ─────────────────────────────────────────────
export function startInactivityCron() {
  // Chaque lundi à 3h du matin
  cron.schedule('0 3 * * 1', () => {
    checkInactiveAccounts().catch((error) => {
      console.error('[CRON] Erreur vérification inactivité :', error);
    });
  });

  console.log('[CRON] Vérification inactivité planifiée (chaque lundi à 3h)');
}

// Export pour pouvoir lancer manuellement en test
export { checkInactiveAccounts };
