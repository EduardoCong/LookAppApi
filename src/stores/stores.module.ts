import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { User } from '../users/entities/user.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Store, Category, User])],
    controllers: [StoresController],
    providers: [StoresService],
})
export class StoresModule { }
