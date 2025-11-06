import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from './store.entity';

@Entity('pos_stock')
export class PosStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'productId' })
  productId: number;

  @Column({ name: 'productName' })
  productName: string;

  @Column()
  quantity: number;

  @Column()
  cost: number;

  @Column({ name: 'storeId' })
  storeId: number;

  @ManyToOne(() => Store, (store) => store.posStocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;
}
