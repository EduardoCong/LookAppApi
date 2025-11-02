import { Controller, Post, Body, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly service: CategoriesService) { }

    @Post()
    @ApiBody({ type: CreateCategoryDto })
    create(@Body() dto: CreateCategoryDto) {
        return this.service.create(dto);
    }

    @Get()
    getAll() {
        return this.service.getAll();
    }

    @Get('with-stores')
    findAll() {
        return this.service.findAll();
    }
}
