import { Store } from 'src/modules/stores/entities/store.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';


@Entity('pos_stock')
export class PosStock {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Store, { nullable: false })
    store: Store;

    @Column({ type: 'int' })
    productId: number;

    @Column({ type: 'varchar', length: 150 })
    productName: string;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    cost: number; // costo unitario
}
