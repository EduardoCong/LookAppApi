import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

import { ProductCategory } from 'src/modules/product-categories/entities/product-category.entity';
import path from 'path';
import * as fs from 'fs';
import { GeminiIaService } from 'src/modules/gemini-ia/gemini-ia.service';
import { ConfigService } from '@nestjs/config';
import { Store } from '../stores/entities/store.entity';
import { SupabaseService } from 'src/supabase.service';

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
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.BASE_URL =
      this.configService.get<string>('URL_PROD') || 'http://localhost:3000';
  }

  async create(
    createProductDto: CreateProductDto,
    imageBuffer?: Buffer,
    mimeType?: string,
    originalName?: string,
  ) {
    const { storeId, categoryId } = createProductDto;

    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('La tienda especificada no existe');

    let category: ProductCategory | undefined;
    if (categoryId) {
      const foundCategory = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });
      if (!foundCategory)
        throw new NotFoundException('La categoría de producto no existe');
      category = foundCategory;
    }

    let finalImageUrl = '';

    if (imageBuffer && mimeType) {
      const safeName = originalName
        ? originalName.replace(/\s+/g, '_').replace(/[^\w.]/g, '')
        : `product_${Date.now()}.${mimeType.split('/')[1]}`;

      try {
        finalImageUrl = await this.supabaseService.uploadImage(
          imageBuffer,
          `products/${safeName}`,
          mimeType,
        );
      } catch (error) {
        console.error('Error al subir imagen a Base:', error);
        throw new InternalServerErrorException('No se pudo subir la imagen');
      }
    }

    // Crear producto
    const product = this.productRepository.create({
      ...createProductDto,
      imageUrl: finalImageUrl,
      store,
      ...(category ? { category } : {}),
    });

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
      if (!store)
        throw new NotFoundException('La tienda especificada no existe');
      product.store = store;
    }

    // Actualizar categoría
    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });
      if (!category)
        throw new NotFoundException('La categoría especificada no existe');
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
