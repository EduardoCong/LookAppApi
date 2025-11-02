import { ApiProperty } from '@nestjs/swagger';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
} from 'typeorm';
import { Product } from 'src/modules/products/entities/product.entity';

@Entity('product_categories')
export class ProductCategory {
    @ApiProperty({ example: 1, description: 'ID único de la categoría' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 'Electrónica', description: 'Nombre de la categoría' })
    @Column({ length: 255 })
    name: string;

    @ApiProperty({
        example: 'Artículos y dispositivos tecnológicos',
        description: 'Descripción de la categoría',
        required: false,
    })
    @Column({ type: 'text', nullable: true })
    description: string;

    @OneToMany(() => Product, (product) => product.category)
    products: Product[];

    @ApiProperty({
        example: '2025-10-25T18:52:31.000Z',
        description: 'Fecha de creación de la categoría',
    })
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
