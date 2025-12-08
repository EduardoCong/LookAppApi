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

@Entity('purchase_fisico')
export class PurchaseFisico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  user_id: number;

  @Column({ type: 'bigint' })
  store_id: number;

  @Column({ type: 'bigint' })
  product_id: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total_price: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pendiente',
  })
  status: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  picked_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  canceled_at: Date | null;

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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
