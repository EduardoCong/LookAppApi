import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Delete,
    ParseIntPipe,
    HttpStatus,
    Put,
} from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/create-product-category.dto';
import { ApiBody, ApiParam } from '@nestjs/swagger';

@Controller('product-categories')
export class ProductCategoriesController {
    constructor(private readonly categoryService: ProductCategoriesService) { }

    @Post()
    @ApiBody({
        type: CreateProductCategoryDto,
        description: 'Datos necesarios para crear una categoría',
    })
    async create(@Body() dto: CreateProductCategoryDto) {
        const category = await this.categoryService.create(dto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Categoría creada correctamente',
            data: category,
        };
    }

    @Get()
    async getAll() {
        const categories = await this.categoryService.getAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de categorías obtenido correctamente',
            total: categories.length,
            data: categories,
        };
    }


    @Get('/with-products')
    async findAll() {
        const categories = await this.categoryService.findAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de categorías con sus productos obtenido correctamente',
            total: categories.length,
            data: categories,
        };
    }

    @Get(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID de la categoría de producto',
        example: 1,
    })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const category = await this.categoryService.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Categoría con ID ${id} obtenida correctamente`,
            data: category,
        };
    }

    @Put(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID de la categoría a actualizar',
        example: 1,
    })
    @ApiBody({
        type: UpdateProductCategoryDto,
        description: 'Campos permitidos para actualizar una categoría',
    })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductCategoryDto,
    ) {
        const updated = await this.categoryService.update(id, dto);
        return {
            statusCode: HttpStatus.OK,
            message: `Categoría con ID ${id} actualizada correctamente`,
            data: updated.data,
        };
    }

    @Delete(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID de la categoría a eliminar',
        example: 1,
    })
    async remove(@Param('id', ParseIntPipe) id: number) {
        const result = await this.categoryService.remove(id);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
        };
    }
}
