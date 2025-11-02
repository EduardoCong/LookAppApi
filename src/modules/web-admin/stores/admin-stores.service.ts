import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store, StoreStatus } from 'src/modules/stores/entities/store.entity';
import { StoreReviewLog } from './entities/store-review-log.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class AdminStoresService {
    constructor(
        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,
        @InjectRepository(StoreReviewLog)
        private readonly logRepo: Repository<StoreReviewLog>,
    ) { }

    async findPending() {
        return this.storeRepo.find({
            where: { status: StoreStatus.PENDING },
            relations: ['user', 'category', 'detail'],
            order: { id: 'DESC' },
        });
    }

    async findOne(id: number) {
        const store = await this.storeRepo.findOne({
            where: { id },
            relations: ['user', 'category', 'detail', 'products'],
        });
        if (!store) throw new NotFoundException(`La tienda con ID ${id} no existe`);
        return store;
    }

    async approve(id: number, adminId: number) {
        const store = await this.findOne(id);
        store.status = StoreStatus.ACTIVE;
        store.is_verified = true;
        await this.storeRepo.save(store);

        await this.logRepo.save({
            store,
            admin: { id: adminId } as User,
            action: 'APPROVED',
        });

        return { message: 'Tienda aprobada correctamente', store };
    }

    async reject(id: number, adminId: number, comment: string) {
        const store = await this.findOne(id);
        store.status = StoreStatus.REJECTED;
        await this.storeRepo.save(store);

        await this.logRepo.save({
            store,
            admin: { id: adminId } as User,
            action: 'REJECTED',
            comment,
        });

        return { message: 'Tienda rechazada correctamente', store };
    }

    async findApproved() {
        return this.storeRepo.find({
            where: { status: StoreStatus.ACTIVE },
            relations: ['user', 'category', 'detail'],
            order: { id: 'DESC' },
        });
    }

    async findRejected() {
        return this.storeRepo.find({
            where: { status: StoreStatus.REJECTED },
            relations: ['user', 'category', 'detail'],
            order: { id: 'DESC' },
        });
    }

}
