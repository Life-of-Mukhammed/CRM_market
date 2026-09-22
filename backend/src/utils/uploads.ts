import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB decoded

// Camera captures (and any other client-side image sources) arrive as
// `data:<mime>;base64,<payload>` strings. Storing that string straight in a
// Mongo document was bloating every product to 15-150KB and slowing down
// every list/search query — this decodes it once and writes it to disk
// instead, so the DB only ever holds a short `/uploads/<file>` path.
export function saveDataUrlImage(dataUrl: string): string {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Расм формати нотўғри (faqat jpeg/png/webp)');
  }
  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Расм ҳажми жуда катта (макс. 5MB)');
  }

  const filename = `${crypto.randomUUID()}.${EXT_BY_MIME[mime]}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
