import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { Store } from 'src/stores/entities/store.entity';
import { ProductCategory } from 'src/product-categories/entities/product-category.entity';
import path from 'path';
import * as fs from 'fs';
import { GeminiIaService } from 'src/gemini-ia/gemini-ia.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductsService {
    private readonly BASE_URL: string;
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
        @InjectRepository(ProductCategory)
        private readonly categoryRepository: Repository<ProductCategory>,
        private readonly geminiIaService: GeminiIaService,
        private readonly configService: ConfigService
    ) {
        this.BASE_URL = this.configService.get<string>('URL_PROD') || 'http://localhost:3000';
    }

    async create(
        createProductDto: CreateProductDto,
        imageBuffer?: Buffer,
        mimeType?: string,
        originalName?: string,
    ) {
        const { storeId, categoryId, imageUrl } = createProductDto;

        const store = await this.storeRepository.findOne({ where: { id: storeId } });
        if (!store) throw new NotFoundException('La tienda especificada no existe');

        let category: ProductCategory | null = null;
        if (categoryId) {
            category = await this.categoryRepository.findOne({ where: { id: categoryId } });
            if (!category) throw new NotFoundException('La categoría de producto no existe');
        }

        let aiDescription: string | null = null;
        let finalImageUrl: string | null = imageUrl ?? null;

        if (imageBuffer && mimeType) {
            aiDescription = await this.geminiIaService.analyzeImage(imageBuffer, mimeType);

            const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');

            const extension = mimeType === 'image/png' ? 'png' :
                mimeType === 'image/jpeg' ? 'jpg' :
                    mimeType === 'image/webp' ? 'webp' : 'jpg';

            const fileName = `product_${Date.now()}.${extension}`;

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, imageBuffer);


            finalImageUrl = `${this.BASE_URL}/uploads/products/${fileName}`;

        }

        const product = this.productRepository.create({
            ...createProductDto,
            aiDescription,
            imageUrl: finalImageUrl,
            store,
            category,
        } as any);

        return await this.productRepository.save(product);
    }


    async findAll() {
        return await this.productRepository.find({
            relations: ['category'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['store', 'category'],
        });
        if (!product) throw new NotFoundException('Producto no encontrado');
        return product;
    }

    async update(
        id: number,
        updateProductDto: UpdateProductDto,
        imageBuffer?: Buffer,
        mimeType?: string,
    ) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['store', 'category'],
        });
        if (!product) throw new NotFoundException('Producto no encontrado');

        // Actualizar tienda
        if (updateProductDto.storeId) {
            const store = await this.storeRepository.findOne({
                where: { id: updateProductDto.storeId },
            });
            if (!store) throw new NotFoundException('La tienda especificada no existe');
            product.store = store;
        }

        // Actualizar categoría
        if (updateProductDto.categoryId) {
            const category = await this.categoryRepository.findOne({
                where: { id: updateProductDto.categoryId },
            });
            if (!category) throw new NotFoundException('La categoría especificada no existe');
            product.category = category;
        }

        // Actualizar imagen (si viene nueva)
        if (imageBuffer && mimeType) {
            const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');
            const extension =
                mimeType === 'image/png'
                    ? 'png'
                    : mimeType === 'image/jpeg'
                        ? 'jpg'
                        : mimeType === 'image/webp'
                            ? 'webp'
                            : 'jpg';
            const fileName = `product_${Date.now()}.${extension}`;

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, imageBuffer);

            product.imageUrl = `${this.BASE_URL}/uploads/products/${fileName}`;
        }

        Object.assign(product, updateProductDto);
        return await this.productRepository.save(product);
    }

    async remove(id: number) {
        const product = await this.productRepository.findOne({ where: { id } });
        if (!product) throw new NotFoundException('Producto no encontrado');

        // Si tiene imagen, la borra del sistema de archivos
        if (product.imageUrl) {
            const filePath = path.join(
                __dirname,
                '..',
                '..',
                'uploads',
                'products',
                path.basename(product.imageUrl),
            );
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await this.productRepository.remove(product);
        return { message: 'Producto eliminado correctamente' };
    }
}
