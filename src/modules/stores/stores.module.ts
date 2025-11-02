import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { Store } from './entities/store.entity';
import { User } from '../users/entities/user.entity';
import { Category } from 'src/modules/categories/entities/category.entity';
import { StoresWebController } from './stores.controller';
import { StoreDetail } from './entities/store-detail.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Store, StoreDetail, Category, User])],
    controllers: [StoresWebController],
    providers: [StoresService],
})
export class StoresModule { }
