
import { Store } from 'src/modules/stores/entities/store.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';

@Entity('pos_sales')
export class PosSale {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Store, { nullable: false })
    store: Store;

    @Column({ type: 'int' })
    productId: number;

    @Column({ type: 'varchar', length: 150 })
    productName: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price: number;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @CreateDateColumn()
    createdAt: Date;
}
