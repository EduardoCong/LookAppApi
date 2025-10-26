import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UploadedFile,
    UseInterceptors,
    ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ApiBody, ApiConsumes, ApiParam } from '@nestjs/swagger';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Datos del producto y archivo opcional de imagen',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Audífonos Bluetooth JBL' },
                description: {
                    type: 'string',
                    example: 'Audífonos con cancelación de ruido y micrófono',
                },
                price: { type: 'number', example: 1299.99 },
                stock: { type: 'integer', example: 20 },
                storeId: { type: 'integer', example: 1 },
                categoryId: { type: 'integer', example: 2 },
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Archivo de imagen opcional (JPG, PNG)',
                },
            },
            required: ['name', 'price', 'stock', 'storeId'],
        },
    })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    async create(
        @UploadedFile() file: Express.Multer.File,
        @Body() createProductDto: CreateProductDto,
    ) {
        const buffer = file?.buffer;
        const mimeType = file?.mimetype;
        return this.productsService.create(createProductDto, buffer, mimeType);
    }

    @Get()
    async findAll() {
        return this.productsService.findAll();
    }

    @Get(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID del producto',
        example: 1,
    })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }
}
