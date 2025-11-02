import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';

import { GeminiIaModule } from 'src/modules/gemini-ia/gemini-ia.module';
import { ProductCategory } from 'src/modules/product-categories/entities/product-category.entity';
import { Store } from '../stores/entities/store.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Product, Store, ProductCategory]), GeminiIaModule],
    controllers: [ProductsController],
    providers: [ProductsService],
})
export class ProductsModule { }
