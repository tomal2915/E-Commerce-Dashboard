// src/modules/media/media.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { multerConfig } from './media.multer.config';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @RequirePermission('media:create')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.mediaService.uploadFile(file, (req as any).user.id);
  }

  @RequirePermission('media:read')
  @Get()
  findAll() {
    return this.mediaService.findAll();
  }

  @RequirePermission('media:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @RequirePermission('media:update')
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
