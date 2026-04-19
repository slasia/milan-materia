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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "../auth/auth.guard";

@Controller()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get("products")
  findAll(
    @Query("category") category?: string,
    @Query("featured") featured?: string,
  ) {
    const filters: { category?: string; featured?: boolean } = {};
    if (category) filters.category = category;
    if (featured !== undefined) filters.featured = featured === "true";
    return this.productsService.findAll(filters);
  }

  @Get("products/:id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/products")
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/products")
  getAll() {
    return this.productsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch("admin/products/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("admin/products/:id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/products/:id/image")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: "./uploads/products",
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, `product-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error("Only image files are allowed"), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `uploads/products/${file.filename}`;
    return this.productsService.updateImage(id, imageUrl);
  }
}
