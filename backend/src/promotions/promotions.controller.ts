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
import { JwtAuthGuard } from '../auth/auth.guard';

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

  @UseGuards(JwtAuthGuard)
  @Get('admin/promotions')
  findAll() {
    return this.promotionsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/promotions')
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/promotions/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/promotions/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
