// src/modules/media/media.multer.config.ts

import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const multerConfig = {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'media'),
    filename: (req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  // NOTE: this only checks the client-supplied mimetype — an easy, fast
  // first-pass filter, NOT the real security boundary. A malicious client
  // can lie here. The actual enforcement happens in MediaService.uploadFile()
  // via file-type's magic-number sniffing on the real bytes after they land
  // on disk — that's the check that can't be spoofed.
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

export { ALLOWED_MIME_TYPES };
