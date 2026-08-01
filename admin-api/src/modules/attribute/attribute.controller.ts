// src/modules/attribute/attribute.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('attributes')
export class AttributeController {
  constructor(private attributeService: AttributeService) {}

  @RequirePermission('attribute:create')
  @Post()
  create(@Body() dto: CreateAttributeDto) {
    return this.attributeService.create(dto);
  }

  @RequirePermission('attribute:watch')
  @Get()
  findAll() {
    return this.attributeService.findAll();
  }

  @RequirePermission('attribute:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attributeService.findOne(id);
  }

  @RequirePermission('attribute:update')
  @Put('values/:valueId')
  updateValue(
    @Param('valueId') valueId: string,
    @Body() dto: CreateAttributeValueDto,
  ) {
    return this.attributeService.updateValue(valueId, dto);
  }

  @RequirePermission('attribute:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attributeService.remove(id);
  }

  // ---- Attribute Values (nested under an attribute) ----

  @RequirePermission('attribute:update')
  @Post(':id/values')
  addValue(@Param('id') id: string, @Body() dto: CreateAttributeValueDto) {
    return this.attributeService.addValue(id, dto);
  }

  @RequirePermission('attribute:update')
  @Delete('values/:valueId')
  removeValue(@Param('valueId') valueId: string) {
    return this.attributeService.removeValue(valueId);
  }
}
