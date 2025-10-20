import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';


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
}
