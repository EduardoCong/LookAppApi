import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly repo: Repository<Category>,
    ) { }

    create(dto: CreateCategoryDto): Promise<Category> {
        const category = this.repo.create(dto);
        return this.repo.save(category);
    }

    getAll(): Promise<Category[]> {
        return this.repo.find();
    }

    findAll(): Promise<Category[]> {
        return this.repo.find({ relations: ['stores'] });
    }
}
