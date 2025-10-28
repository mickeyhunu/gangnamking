const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, IMAGE_FILE_EXTENSIONS } = require('./constants');
const { sanitizeResourcePath, normalizeWebPath, getDirectoryFromResource } = require('./pathUtils');

function getImageDirectoriesForShop(shop) {
  const directories = new Set();

  if (shop && typeof shop.galleryDir === 'string') {
    const sanitizedDir = sanitizeResourcePath(shop.galleryDir);

    if (sanitizedDir && sanitizedDir.startsWith('images/')) {
      directories.add(sanitizedDir);
    }
  }

  const candidates = [];

  if (shop && typeof shop.image === 'string') {
    candidates.push(shop.image);
  }

  if (Array.isArray(shop?.gallery)) {
    shop.gallery.forEach((entry) => {
      const src = typeof entry === 'string' ? entry : entry && entry.src;

      if (typeof src === 'string') {
        candidates.push(src);
      }
    });
  }

  candidates.forEach((candidate) => {
    const dir = getDirectoryFromResource(candidate);

    if (dir) {
      directories.add(dir);
    }
  });

  return Array.from(directories);
}

function readImagesFromDirectory(relativeDir) {
  if (typeof relativeDir !== 'string' || !relativeDir) {
    return [];
  }

  const absoluteDir = path.join(PUBLIC_DIR, relativeDir);

  try {
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && IMAGE_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => `/${path.posix.join(relativeDir, entry.name)}`)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  } catch (error) {
    return [];
  }
}

function buildGalleryEntry(entry, fallbackAlt) {
  if (!entry) {
    return null;
  }

  const candidate = typeof entry === 'string' ? { src: entry } : entry;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const normalizedSrc = normalizeWebPath(candidate.src);

  if (!normalizedSrc) {
    return null;
  }

  const altText = typeof candidate.alt === 'string' && candidate.alt.trim()
    ? candidate.alt.trim()
    : fallbackAlt;

  return {
    ...candidate,
    src: normalizedSrc,
    alt: altText,
  };
}

function augmentGalleryWithFolderImages(shop) {
  const fallbackAltBase = typeof shop?.name === 'string' && shop.name.trim()
    ? shop.name.trim()
    : 'Shop';
  const fallbackAlt = `${fallbackAltBase} 이미지`;
  const result = [];
  const seen = new Set();

  function addEntry(entry) {
    const galleryEntry = buildGalleryEntry(entry, fallbackAlt);

    if (!galleryEntry || seen.has(galleryEntry.src)) {
      return;
    }

    seen.add(galleryEntry.src);
    result.push(galleryEntry);
  }

  if (Array.isArray(shop?.gallery)) {
    shop.gallery.forEach((entry) => addEntry(entry));
  }

  if (typeof shop?.image === 'string') {
    const altOverride = typeof shop.imageAlt === 'string' ? shop.imageAlt : undefined;
    addEntry({ src: shop.image, alt: altOverride });
  }

  getImageDirectoriesForShop(shop).forEach((dir) => {
    readImagesFromDirectory(dir).forEach((src) => addEntry({ src }));
  });

  return result;
}

function derivePrimaryImage(localizedShop) {
  if (!localizedShop || typeof localizedShop !== 'object') {
    return null;
  }

  if (Array.isArray(localizedShop.gallery) && localizedShop.gallery.length) {
    return localizedShop.gallery[0];
  }

  const normalized = normalizeWebPath(localizedShop.image);

  if (!normalized) {
    return null;
  }

  const fallbackAltBase = typeof localizedShop.name === 'string' && localizedShop.name.trim()
    ? localizedShop.name.trim()
    : 'Shop';

  return {
    src: normalized,
    alt: localizedShop.imageAlt
      || `${fallbackAltBase} 이미지`,
  };
}

module.exports = {
  getImageDirectoriesForShop,
  readImagesFromDirectory,
  buildGalleryEntry,
  augmentGalleryWithFolderImages,
  derivePrimaryImage,
};
