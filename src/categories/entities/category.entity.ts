import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Store } from '../../stores/entities/store.entity';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 100 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @OneToMany(() => Store, (store) => store.category)
    stores: Store[];
}
