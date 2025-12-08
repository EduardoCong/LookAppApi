import { Product } from "src/modules/products/entities/product.entity";
import { Store } from "src/modules/stores/entities/store.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


@Entity('purchase_apartado')
export class PurchaseApartado {
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
        default: 'apartado',
    })
    status: string;

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