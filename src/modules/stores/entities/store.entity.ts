import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from 'src/modules/categories/entities/category.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { StoreDetail } from './store-detail.entity';
import { StoreReviewLog } from 'src/modules/web-admin/stores/entities/store-review-log.entity';

// 🔹 Definición de estados posibles
export enum StoreStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    REJECTED = 'rejected',
}

@Entity('stores')
export class Store {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 150 })
    business_name: string;

    @Column({ length: 100 })
    owner_name: string;

    @Column({ type: 'text' })
    address: string;

    @Column({ type: 'text', nullable: true })
    map_url: string;

    @Column({ length: 150, nullable: true })
    longitude: string;

    @Column({ length: 150, nullable: true })
    latitude: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    // 🔹 Nuevo campo de estado
    @Column({
        type: 'enum',
        enum: StoreStatus,
        default: StoreStatus.PENDING,
    })
    status: StoreStatus;

    @Column({ default: true })
    is_verified: boolean;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Category, (category) => category.stores)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @OneToMany(() => Product, (product) => product.store)
    products: Product[];

    @OneToOne(() => StoreDetail, (detail) => detail.store, { cascade: true })
    detail: StoreDetail;

    @OneToMany(() => StoreReviewLog, (log) => log.store)
    reviewLogs: StoreReviewLog[];


}
