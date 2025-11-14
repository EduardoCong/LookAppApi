import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { Product } from 'src/modules/products/entities/product.entity';

@Entity({ name: 'purchase_apartado' })
export class PurchaseApartado {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'user_id' })      // 👈 NOMBRE REAL DE LA COLUMNA
    user: User;

    @ManyToOne(() => Store, { eager: true })
    @JoinColumn({ name: 'store_id' })     // 👈 NOMBRE REAL DE LA COLUMNA
    store: Store;

    @ManyToOne(() => Product, { eager: true })
    @JoinColumn({ name: 'product_id' })   // 👈 NOMBRE REAL DE LA COLUMNA
    product: Product;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'numeric', precision: 15, scale: 2 })
    unit_price: number;

    @Column({ type: 'numeric', precision: 15, scale: 2 })
    total_price: number;

    @Column({ type: 'numeric', precision: 5, scale: 2 })
    porcentaje_pagado: number;

    @Column({ type: 'numeric', precision: 15, scale: 2 })
    monto_pagado: number;

    @Column({ type: 'numeric', precision: 15, scale: 2 })
    saldo_pendiente: number;

    @Column({ type: 'numeric', precision: 15, scale: 2 })
    saldo_final: number;

    @Column({
        type: 'varchar',
        default: 'apartado'
    })
    status: 'apartado' | 'liquidado' | 'recogido';


    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
