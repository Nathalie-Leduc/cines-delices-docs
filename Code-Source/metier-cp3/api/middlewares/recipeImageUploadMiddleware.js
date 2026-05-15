import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

// ============================================================
// MIDDLEWARE UPLOAD IMAGE — Multer + Sharp
// ============================================================
//
// Flux :
//   1. Multer reçoit l'image en mémoire (buffer, pas sur disque)
//   2. Sharp convertit en WebP, redimensionne si trop grande
//   3. Le fichier final .webp est écrit sur disque
//   4. L'URL publique est injectée dans req.body.imageUrl
//
// Avantages du WebP :
//   - 25-35% plus léger que JPG à qualité égale
//   - Supporté par tous les navigateurs modernes
//   - Meilleur pour le SEO et les performances
// ============================================================

const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// Configuration Sharp : qualité et dimensions max
const SHARP_CONFIG = {
  webpQuality: 80,        // 80% = bon compromis qualité/poids
  maxWidth: 1200,          // largeur max (les recettes n'ont pas besoin de 4K)
  maxHeight: 1200,         // hauteur max
};

let sharpLoaderPromise = null;

async function getSharp() {
  if (!sharpLoaderPromise) {
    sharpLoaderPromise = import('sharp')
      .then((module) => module.default || module)
      .catch((error) => {
        console.warn('[UPLOAD] Sharp indisponible, conversion image désactivée :', error.message);
        return null;
      });
  }

  return sharpLoaderPromise;
}

// Créer le dossier uploads s'il n'existe pas
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─────────────────────────────────────────────
// Multer en mode MÉMOIRE (buffer)
// ─────────────────────────────────────────────
// On ne sauvegarde pas le fichier brut sur disque.
// On le garde en RAM le temps que Sharp le convertisse.
const memoryStorage = multer.memoryStorage();

function imageFileFilter(_req, file, cb) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const isAllowedMime = ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype);
  const isAllowedExt = ALLOWED_IMAGE_EXTENSIONS.has(extension);

  if (isAllowedMime || isAllowedExt) {
    cb(null, true);
    return;
  }

  cb(new Error('Seuls les fichiers PNG, JPG, JPEG ou WEBP sont acceptes.'));
}

const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
}).single('image');

// ─────────────────────────────────────────────
// Conversion Sharp : buffer → fichier .webp
// ─────────────────────────────────────────────
//   1. Redimensionne si trop grande (max 1200x1200)
//   2. Convertit en WebP (format optimisé)
//   3. Compresse à 80% de qualité
//   4. Écrit le fichier final sur disque
async function convertToWebp(buffer) {
  const sharp = await getSharp();
  if (!sharp) {
    throw new Error('Sharp indisponible');
  }

  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `recipe-${unique}.webp`;
  const outputPath = path.join(UPLOADS_DIR, filename);

  await sharp(buffer)
    .resize({
      width: SHARP_CONFIG.maxWidth,
      height: SHARP_CONFIG.maxHeight,
      fit: 'inside',            // garde les proportions, ne déforme pas
      withoutEnlargement: true, // ne pas agrandir si plus petit que le max
    })
    .webp({
      quality: SHARP_CONFIG.webpQuality,
    })
    .toFile(outputPath);

  return filename;
}

// ─────────────────────────────────────────────
// URL publique
// ─────────────────────────────────────────────
function buildPublicImageUrl(req, filename) {
  const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${filename}`;
}

// ─────────────────────────────────────────────
// Middleware principal : upload + conversion
// ─────────────────────────────────────────────
// Remplace l'ancien handleRecipeImageUpload.
// Même signature, même comportement côté contrôleur,
// mais maintenant les images sortent en WebP optimisé.
export function handleRecipeImageUpload(req, res, next) {
  uploadToMemory(req, res, async (error) => {
    // Gestion des erreurs Multer (taille, type...)
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image trop lourde: 5MB maximum.' });
      }
      return res.status(400).json({ message: 'Upload image invalide.' });
    }

    if (error) {
      return res.status(400).json({ message: error.message || 'Upload image invalide.' });
    }

    // Si pas de fichier uploadé, on continue (l'image est optionnelle)
    if (!req.file?.buffer) {
      return next();
    }

    // Conversion en WebP avec Sharp
    try {
      const filename = await convertToWebp(req.file.buffer);
      req.body.imageUrl = buildPublicImageUrl(req, filename);

      // Stocker le nom du fichier pour d'éventuels usages ultérieurs
      req.file.filename = filename;
      req.file.path = path.join(UPLOADS_DIR, filename);

      return next();
    } catch (sharpError) {
      console.error('[SHARP] Erreur conversion image :', sharpError.message);
      return res.status(400).json({
        message: 'Impossible de traiter cette image. Vérifiez qu\'il s\'agit bien d\'un fichier PNG, JPG ou WEBP valide.',
      });
    }
  });
}

// ─────────────────────────────────────────────
// Parser les champs multipart (inchangé)
// ─────────────────────────────────────────────
export function parseRecipeMultipartFields(req, _res, next) {
  if (typeof req.body?.ingredients === 'string') {
    try {
      req.body.ingredients = JSON.parse(req.body.ingredients);
    } catch {
      req.body.ingredients = [];
    }
  }

  if (typeof req.body?.etapes === 'string') {
    try {
      req.body.etapes = JSON.parse(req.body.etapes);
    } catch {
      req.body.etapes = [];
    }
  }

  return next();
}
