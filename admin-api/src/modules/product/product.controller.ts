// src/modules/product/product.controller.ts
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @RequirePermission('product:create')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  // Public: product listing is usually shown on a storefront too
  @Public()
  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }
}
