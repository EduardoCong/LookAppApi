import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from 'src/categories/entities/category.entity';

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

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: true })
    is_verified: boolean;

    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Category, (category) => category.stores)
    @JoinColumn({ name: 'category_id' })
    category: Category;
}
