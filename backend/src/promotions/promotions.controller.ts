import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { AdminJwtGuard } from '../auth/auth.guard';

@Controller()
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get('promotions/active')
  getActive(@Query('type') type?: string) {
    return this.promotionsService.getActive(type);
  }

  @Post('promotions/validate-code')
  validateCode(@Body() validateCodeDto: ValidateCodeDto) {
    return this.promotionsService.validateCode(
      validateCodeDto.code,
      validateCodeDto.cartTotal,
    );
  }

  @UseGuards(AdminJwtGuard)
  @Get('admin/promotions')
  findAll() {
    return this.promotionsService.findAll();
  }

  @UseGuards(AdminJwtGuard)
  @Post('admin/promotions')
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @UseGuards(AdminJwtGuard)
  @Patch('admin/promotions/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @UseGuards(AdminJwtGuard)
  @Delete('admin/promotions/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
