import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';

@Injectable()
export class ProductCategoriesService {
    constructor(
        @InjectRepository(ProductCategory)
        private readonly categoryRepository: Repository<ProductCategory>,
    ) { }

    async create(createCategoryDto: CreateProductCategoryDto) {
        const category = this.categoryRepository.create(createCategoryDto);
        return await this.categoryRepository.save(category);
    }

    async findAll() {
        return await this.categoryRepository.find({
            relations: ['products'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number) {
        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['products'],
        });
        if (!category) throw new NotFoundException('Categoría no encontrada');
        return category;
    }

    async remove(id: number) {
        const category = await this.findOne(id);
        await this.categoryRepository.remove(category);
        return { message: 'Categoría eliminada correctamente' };
    }
}
