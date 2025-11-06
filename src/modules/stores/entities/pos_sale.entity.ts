import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Store } from './store.entity';

@Entity('pos_sales')
export class PosSale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'productId' })
  productId: number;

  @Column({ name: 'productName' })
  productName: string;

  @Column()
  price: number;

  @Column()
  quantity: number;

  @Column()
  total: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @Column({ name: 'storeId' })
  storeId: number;

  @ManyToOne(() => Store, (store) => store.posSales, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;
}
