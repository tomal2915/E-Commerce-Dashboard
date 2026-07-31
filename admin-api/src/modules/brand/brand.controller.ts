// src/modules/brand/brand.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { BrandQueryDto } from './dto/brand-query.dto';

@Controller('brands')
export class BrandController {
  constructor(private brandService: BrandService) {}

  @RequirePermission('brand:create')
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @RequirePermission('brand:watch')
  @Get()
  findAll(@Query() query: BrandQueryDto) {
    return this.brandService.findAll(query);
  }

  @RequirePermission('brand:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandService.findOne(id);
  }

  @RequirePermission('brand:update')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandService.update(id, dto);
  }

  @RequirePermission('brand:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }
}
