import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Store } from 'src/stores/entities/store.entity';
import { ProductCategory } from 'src/product-categories/entities/product-category.entity';

@Entity('products')
export class Product {
    @ApiProperty({ example: 1, description: 'ID único del producto' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 'Smartphone Galaxy A15', description: 'Nombre del producto' })
    @Column({ length: 255 })
    name: string;

    @ApiProperty({
        example: 'Teléfono de gama media con pantalla de 6.5 pulgadas',
        description: 'Descripción del producto',
        required: false,
    })
    @Column({ type: 'text', nullable: true })
    description: string;

    @ApiProperty({
        example: 'Smartphone negro con cámara de 50MP, pantalla AMOLED',
        description: 'Descripción generada por IA (Gemini)',
        required: false,
    })
    @Column({ name: 'ai_description', type: 'text', nullable: true })
    aiDescription: string;

    @ApiProperty({ example: 5499.99, description: 'Precio del producto en MXN' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @ApiProperty({ example: 15, description: 'Cantidad disponible en stock' })
    @Column({ type: 'int', default: 0 })
    stock: number;

    @ApiProperty({
        example: '/uploads/products/product_1234_image.jpg',
        description: 'Ruta o URL de la imagen del producto',
        required: false,
    })
    @Column({ name: 'image_url', type: 'varchar', length: 255, nullable: true })
    imageUrl: string;

    @ManyToOne(() => Store, (store) => store.products, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @ManyToOne(() => ProductCategory, (category) => category.products, {
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'category_id' })
    category: ProductCategory;

    @ApiProperty({
        example: '2025-10-25T18:52:31.000Z',
        description: 'Fecha de creación del producto',
    })
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
