import { Store } from 'src/modules/stores/entities/store.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';


@Entity('store_review_logs')
export class StoreReviewLog {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Store, (store) => store.reviewLogs, { onDelete: 'CASCADE' })
    store: Store;

    @ManyToOne(() => User, { nullable: true })
    admin: User;

    @Column({ type: 'enum', enum: ['APPROVED', 'REJECTED'] })
    action: 'APPROVED' | 'REJECTED';

    @Column({ type: 'text', nullable: true })
    comment: string;

    @CreateDateColumn()
    createdAt: Date;
}
