// src/modules/media/media.multer.config.ts
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

// Only allow real image types — protects against someone uploading
// a disguised .exe or .php file with a fake image extension.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/media',
    filename: (req, file, callback) => {
      // Never trust the original filename — generate our own to avoid
      // collisions and path traversal tricks (e.g. "../../etc/passwd").
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req: any, file: Express.Multer.File, callback: any) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        ),
        false,
      );
    }
    callback(null, true);
  },
};
