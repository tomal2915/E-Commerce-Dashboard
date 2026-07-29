// src/modules/category/category.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @RequirePermission('category:create')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // Public: category tree is typically shown on a public storefront too
  @Public()
  @Get('tree')
  getTree() {
    return this.categoryService.getTree();
  }

  @RequirePermission('category:read')
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @RequirePermission('category:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @RequirePermission('category:update')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @RequirePermission('category:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
