// src/modules/product/product.controller.ts

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
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @RequirePermission('product:create')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @RequirePermission('product:watch')
  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @RequirePermission('product:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @RequirePermission('product:update')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @RequirePermission('product:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
