import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/create-product-category.dto';

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

    async getAll() {
        return await this.categoryRepository.find({
            order: { createdAt: 'DESC' },
        });
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

    async update(id: number, updateCategoryDto: UpdateProductCategoryDto) {
        const category = await this.findOne(id);
        Object.assign(category, updateCategoryDto);
        const updated = await this.categoryRepository.save(category);
        return {
            message: 'Categoría actualizada correctamente',
            data: updated,
        };
    }

    async remove(id: number) {
        const category = await this.findOne(id);
        await this.categoryRepository.remove(category);
        return { message: 'Categoría eliminada correctamente' };
    }
}
