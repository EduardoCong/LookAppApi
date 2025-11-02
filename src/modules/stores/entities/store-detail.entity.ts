import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

@Entity('store_details')
export class StoreDetail {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ length: 20, nullable: true })
    rfc?: string;

    @Column({ length: 30, nullable: true })
    phone?: string;

    @Column({ length: 150, nullable: true })
    email_contact?: string;

    @Column({ type: 'text', nullable: true })
    logo_url?: string;

    @Column({ type: 'text', nullable: true })
    cover_image_url?: string;

    @Column({ type: 'jsonb', nullable: true })
    opening_hours?: Record<string, string>;

    @Column({ type: 'text', nullable: true })
    reference?: string;

    @Column({ length: 50, nullable: true })
    contact_method?: string;

    @Column({ type: 'jsonb', nullable: true })
    social_links?: Record<string, string>;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @OneToOne(() => Store, (store) => store.detail, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    store: Store;
}
