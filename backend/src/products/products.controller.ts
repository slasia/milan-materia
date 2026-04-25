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
import { AdminJwtGuard } from "../auth/auth.guard";
import { BulkDeleteDto } from "../common/dto/bulk-delete.dto";

const imageInterceptor = FileInterceptor("image", {
  storage: diskStorage({
    destination: "./uploads/products",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
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
});

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

  @UseGuards(AdminJwtGuard)
  @Post("admin/products")
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @UseGuards(AdminJwtGuard)
  @Get("admin/products")
  getAll() {
    return this.productsService.findAll();
  }

  @UseGuards(AdminJwtGuard)
  @Patch("admin/products/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(AdminJwtGuard)
  @Delete("admin/products/:id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  /** Bulk delete: DELETE /admin/products  body: { ids: number[] } */
  @UseGuards(AdminJwtGuard)
  @Delete("admin/products")
  @HttpCode(HttpStatus.OK)
  removeMany(@Body() dto: BulkDeleteDto) {
    return this.productsService.removeMany(dto.ids);
  }

  /** Legacy: update single cover image (also used by camera button in products table) */
  @UseGuards(AdminJwtGuard)
  @Post("admin/products/:id/image")
  @UseInterceptors(imageInterceptor)
  async uploadImage(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `uploads/products/${file.filename}`;
    return this.productsService.updateImage(id, imageUrl);
  }

  /** Add one image to the product gallery */
  @UseGuards(AdminJwtGuard)
  @Post("admin/products/:id/images")
  @UseInterceptors(imageInterceptor)
  async addImage(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = `uploads/products/${file.filename}`;
    return this.productsService.addImage(id, url);
  }

  /** Delete one image from the product gallery */
  @UseGuards(AdminJwtGuard)
  @Delete("admin/products/:id/images/:imageId")
  removeImage(
    @Param("id", ParseIntPipe) productId: number,
    @Param("imageId", ParseIntPipe) imageId: number,
  ) {
    return this.productsService.removeImage(productId, imageId);
  }
}
