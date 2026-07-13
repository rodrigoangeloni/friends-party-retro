const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ROMS_DIR = path.join(__dirname, 'public', 'roms');
const COVERS_DIR = path.join(__dirname, 'public', 'covers');

fs.mkdirSync(ROMS_DIR, { recursive: true });
fs.mkdirSync(COVERS_DIR, { recursive: true });

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

const ROM_EXTENSIONS = ['.sfc', '.smc', '.nes', '.gba', '.gb', '.gbc', '.gen', '.md', '.zip', '.7z'];
const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function romFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, ROM_EXTENSIONS.includes(ext));
}

function coverFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, COVER_EXTENSIONS.includes(ext));
}

const combinedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'rom' ? ROMS_DIR : COVERS_DIR;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'rom') {
      const base = sanitizeFilename(path.basename(file.originalname, ext));
      cb(null, `${Date.now()}-${base}${ext}`);
    } else {
      cb(null, `${Date.now()}${ext}`);
    }
  }
});

function combinedFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'rom') {
    cb(null, ROM_EXTENSIONS.includes(ext));
  } else if (file.fieldname === 'cover') {
    cb(null, COVER_EXTENSIONS.includes(ext));
  } else {
    cb(null, false);
  }
}

const uploadGameFiles = multer({
  storage: combinedStorage,
  fileFilter: combinedFilter,
  limits: { fileSize: 16 * 1024 * 1024 }
}).fields([
  { name: 'rom', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

function deleteFile(filePath) {
  try {
    const fullPath = path.join(__dirname, 'public', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (e) {
    console.error('[Upload] Error deleting file:', e.message);
  }
  return false;
}

module.exports = { uploadGameFiles, deleteFile, ROM_EXTENSIONS, COVER_EXTENSIONS };
