import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminJwtGuard } from '../auth/auth.guard';

@Controller()
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get('categories')
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('categories/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(AdminJwtGuard)
  @Get('admin/categories')
  findAllAdmin() {
    return this.categoriesService.findAllAdmin();
  }

  @UseGuards(AdminJwtGuard)
  @Post('admin/categories')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @UseGuards(AdminJwtGuard)
  @Patch('admin/categories/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @UseGuards(AdminJwtGuard)
  @Delete('admin/categories/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }

  /** Bulk delete: DELETE /admin/categories  body: { ids: number[] } */
  @UseGuards(AdminJwtGuard)
  @Delete('admin/categories')
  @HttpCode(HttpStatus.OK)
  removeMany(@Body() body: { ids: number[] }) {
    return this.categoriesService.removeMany(body.ids);
  }
}
