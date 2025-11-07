import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
} from 'typeorm';
import { AiSearchInput } from './ai_search_input.entity';

@Entity('ai_search_output')
export class AiSearchOutput {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => AiSearchInput, (input) => input.outputs, {
        onDelete: 'CASCADE',
    })
    input: AiSearchInput;

    @Column({ type: 'jsonb', nullable: true })
    response?: any; // respuesta completa de la IA (puede ser array o objeto)

    @Column({ default: true })
    success: boolean;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
