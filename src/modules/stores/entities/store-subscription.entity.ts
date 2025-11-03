import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

@Entity('store_subscriptions')
export class StoreSubscription {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Store, (store) => store.subscriptions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({ length: 255, nullable: true })
    stripe_subscription_id?: string;

    @Column({ length: 255, nullable: true })
    stripe_customer_id?: string;

    @Column({ length: 255, nullable: true })
    price_id?: string;

    @Column({ length: 100, nullable: true })
    plan_key?: string; // 'basico' | 'premium' etc.

    @Column({ length: 50, nullable: true })
    status?: string;

    @Column({ type: 'timestamp', nullable: true })
    current_period_start?: Date;

    @Column({ type: 'timestamp', nullable: true })
    current_period_end?: Date;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;
}
