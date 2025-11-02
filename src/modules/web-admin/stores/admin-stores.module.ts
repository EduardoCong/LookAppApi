import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminStoresService } from './admin-stores.service';
import { AdminStoresController } from './admin-stores.controller';
import { Store } from 'src/modules/stores/entities/store.entity';
import { StoreReviewLog } from './entities/store-review-log.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Store, StoreReviewLog])],
    controllers: [AdminStoresController],
    providers: [AdminStoresService],
})
export class AdminStoresModule { }
