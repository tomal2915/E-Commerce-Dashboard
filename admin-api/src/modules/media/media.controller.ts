// src/modules/media/media.controller.ts — full replacement
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { multerConfig } from './media.multer.config';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @RequirePermission('media:upload')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.mediaService.uploadFile(file, (req as any).user.id);
  }

  @RequirePermission('media:upload')
  @Post('upload-many')
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  uploadMany(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    return this.mediaService.uploadMany(files, (req as any).user.id);
  }

  @RequirePermission('media:watch')
  @Get()
  findAll(@Query() query: MediaQueryDto) {
    return this.mediaService.findAll(query);
  }

  @RequirePermission('media:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @RequirePermission('media:write')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @RequirePermission('media:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
