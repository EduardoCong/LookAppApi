import { Store } from 'src/modules/stores/entities/store.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, CreateDateColumn } from 'typeorm';


export enum UserRole {
    SUPERADMIN = 'superadmin',
    STORE = 'store',
    CLIENT = 'client',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ unique: true, nullable: true })
    username: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.CLIENT,
    })
    role: UserRole;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @OneToOne(() => Store, (store) => store.user)
    store: Store;
}
