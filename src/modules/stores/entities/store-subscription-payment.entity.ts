import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('store_subscription_payments')
export class StoreSubscriptionPayment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    store_id: number;

    @Column('numeric')
    amount: number;

    @Column({ default: 'MXN' })
    currency: string;

    @Column({ nullable: true })
    stripe_charge_id: string;

    @Column({ nullable: true })
    stripe_payment_intent_id: string;

    @Column()
    status: string;

    @Column({ nullable: true, type: 'timestamp' })
    paid_at: Date;

    @Column({ type: 'timestamp', default: () => 'NOW()' })
    created_at: Date;
}
