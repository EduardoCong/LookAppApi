import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('purchases_full')
export class PurchasesFull {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  product_id: number;

  @Column({ type: 'bigint' })
  store_id: number;

  @Column({ type: 'bigint' })
  user_id: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total_price: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'pendiente',
  })
  status: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
