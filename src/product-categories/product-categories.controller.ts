import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Delete,
    ParseIntPipe,
} from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
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
        return this.categoryService.create(dto);
    }

    @Get()
    async findAll() {
        return this.categoryService.findAll();
    }

    @Get(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID de la categoría de producto',
        example: 1,
    })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.categoryService.findOne(id);
    }

    @Delete(':id')
    @ApiParam({
        name: 'id',
        required: true,
        description: 'ID de la categoría a eliminar',
        example: 1,
    })
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.categoryService.remove(id);
    }
}
