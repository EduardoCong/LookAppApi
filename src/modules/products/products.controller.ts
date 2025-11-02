import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UploadedFile,
    UseInterceptors,
    ParseIntPipe,
    Put,
    Delete,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ApiBody, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
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
        const product = await this.productsService.create(createProductDto, buffer, mimeType);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Producto creado correctamente',
            data: product,
        };
    }

    @Get()
    async findAll() {
        const products = await this.productsService.findAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de productos obtenido correctamente',
            total: products.length,
            data: products,
        };
    }

    @Get(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID del producto',
        example: 1,
    })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const product = await this.productsService.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Producto con ID ${id} obtenido correctamente`,
            data: product,
        };
    }

    @Put(':id')
    @ApiConsumes('multipart/form-data')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID del producto a actualizar',
        example: 1,
    })
    @ApiBody({
        description: 'Campos del producto a actualizar y archivo de imagen opcional',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Audífonos Bluetooth JBL Pro' },
                description: {
                    type: 'string',
                    example: 'Versión mejorada con cancelación de ruido activa',
                },
                price: { type: 'number', example: 1499.99 },
                stock: { type: 'integer', example: 30 },
                storeId: { type: 'integer', example: 1 },
                categoryId: { type: 'integer', example: 2 },
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Nueva imagen opcional',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateProductDto: UpdateProductDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const buffer = file?.buffer;
        const mimeType = file?.mimetype;
        const updated = await this.productsService.update(id, updateProductDto, buffer, mimeType);
        return {
            statusCode: HttpStatus.OK,
            message: `Producto con ID ${id} actualizado correctamente`,
            data: updated,
        };
    }


    @Delete(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID del producto a eliminar',
        example: 1,
    })
    async remove(@Param('id', ParseIntPipe) id: number) {
        const result = await this.productsService.remove(id);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
        };
    }
}
