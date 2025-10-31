import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto, UpdateStoreDto } from './dto/create-store.dto';


import { Category } from 'src/categories/entities/category.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class StoresService {
    constructor(
        @InjectRepository(Store)
        private storeRepo: Repository<Store>,
        @InjectRepository(Category)
        private categoryRepo: Repository<Category>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

    getAll(): Promise<Store[]> {
        return this.storeRepo.find({ relations: ['category'] });
    }

    async create(dto: CreateStoreDto): Promise<Store> {
        const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
        const category = await this.categoryRepo.findOne({ where: { id: dto.category_id } });

        const createData: Partial<Store> & Record<string, any> = {
            ...dto,
        };
        if (user) {
            createData.user = user;
        }
        if (category) {
            createData.category = category;
        }

        const store = this.storeRepo.create(createData);

        return this.storeRepo.save(store);
    }

    findAll(): Promise<Store[]> {
        return this.storeRepo.find({ relations: ['user', 'category'] });
    }

    getStorewithProducts(): Promise<Store[]> {
        return this.storeRepo.find({ relations: ['products'] });
    }

    async findOne(id: number): Promise<Store> {
        const store = await this.storeRepo.findOne({
            where: { id },
            relations: ['user', 'category', 'products'],
        });

        if (!store) {
            throw new NotFoundException(`La tienda con ID ${id} no existe`);
        }

        return store;
    }

    async update(id: number, dto: UpdateStoreDto): Promise<Store> {
        const store = await this.storeRepo.findOne({ where: { id }, relations: ['user', 'category'] });

        if (!store) {
            throw new NotFoundException(`La tienda con ID ${id} no existe`);
        }

        // Si envía un nuevo usuario
        if (dto.user_id) {
            const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
            if (!user) throw new NotFoundException(`El usuario con ID ${dto.user_id} no existe`);
            store.user = user;
        }

        // Si envía una nueva categoría
        if (dto.category_id) {
            const category = await this.categoryRepo.findOne({ where: { id: dto.category_id } });
            if (!category) throw new NotFoundException(`La categoría con ID ${dto.category_id} no existe`);
            store.category = category;
        }

        Object.assign(store, dto);

        return this.storeRepo.save(store);
    }

    async remove(id: number): Promise<void> {
        const store = await this.storeRepo.findOne({ where: { id } });
        if (!store) {
            throw new NotFoundException(`La tienda con ID ${id} no existe`);
        }
        await this.storeRepo.remove(store);
    }

}
