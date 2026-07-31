// src/modules/media/media.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaQueryDto } from './dto/media-query.dto';

// const THUMBNAIL_DIR = join(process.cwd(), 'uploads', 'media', 'thumbnails');
const THUMBNAIL_DIR = path.join(
  process.cwd(),
  'uploads',
  'media',
  'thumbnails',
);
const THUMBNAIL_WIDTH = 300;

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Saves metadata for a file that Multer already wrote to disk, and
   * generates a resized thumbnail alongside the original using sharp.
   */
  async uploadFile(file: Express.Multer.File, uploadedById: string) {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }

    // Step 1: Read image dimensions (width/height) using sharp
    let width: number | undefined;
    let height: number | undefined;
    let thumbnailPath: string | undefined;

    try {
      const image = sharp(file.path);
      const metadata = await image.metadata();
      width = metadata.width;
      height = metadata.height;

      // Step 2: Generate a resized thumbnail, saved as its own file
      await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
      const thumbnailFileName = `thumb-${file.filename}`;
      thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFileName);

      await image
        .resize({ width: THUMBNAIL_WIDTH }) // keeps aspect ratio automatically
        .toFile(thumbnailPath);
    } catch (err) {
      // If sharp fails (e.g. corrupted image), clean up the uploaded file
      // so we don't leave orphaned files on disk, then report the error.
      await fs.unlink(file.path).catch(() => {});
      throw new BadRequestException('Uploaded file is not a valid image');
    }

    // Step 3: Store all metadata in the database
    const media = await this.prisma.media.create({
      data: {
        fileName: file.originalname,
        storedPath: file.path,
        publicUrl: `/uploads/media/${file.filename}`,
        mimeType: file.mimetype,
        type: 'image',
        size: file.size,
        width,
        height,
        thumbnail: thumbnailPath
          ? `/uploads/media/thumbnails/thumb-${file.filename}`
          : null,
        uploadedById,
      },
    });

    return media;
  }

  async uploadMany(files: Express.Multer.File[], uploadedById: string) {
    const results: Awaited<ReturnType<typeof this.uploadFile>>[] = [];
    for (const file of files) {
      results.push(await this.uploadFile(file, uploadedById));
    }
    return results;
  }

  async findAll(query: MediaQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;

    const where = {
      ...(query.search && {
        fileName: { contains: query.search, mode: 'insensitive' as const },
      }),
      ...(query.type && { type: query.type }),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.media.count({ where }),
      this.prisma.media.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async update(id: string, dto: UpdateMediaDto) {
    await this.findOne(id); // throws if not found
    return this.prisma.media.update({
      where: { id },
      data: { altText: dto.altText, title: dto.title },
    });
  }

  /**
   * Deletes the DB record AND the physical files from disk
   * (original + thumbnail), so we never leave orphaned files behind.
   */
  async remove(id: string) {
    const media = await this.findOne(id);

    // Detach cleanly from every product/variant/attribute-value attachment
    // rather than refusing the delete — other products keep working, they
    // simply lose this specific image reference.
    await this.prisma.productMedia.deleteMany({ where: { mediaId: id } });
    await this.prisma.attributeValue.updateMany({
      where: { referenceMediaId: id },
      data: { referenceMediaId: null },
    });

    await fs.unlink(media.storedPath).catch(() => {});
    if (media.thumbnail) {
      const thumbnailFsPath = media.thumbnail.replace('/uploads', './uploads');
      await fs.unlink(thumbnailFsPath).catch(() => {});
    }

    await this.prisma.media.delete({ where: { id } });
    return { message: 'Media deleted successfully' };
  }
}
