import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
} from 'typeorm';
import { AiSearchInput } from './ai_search_input.entity';

@Entity('ai_search_output')
export class AiSearchOutput {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => AiSearchInput, (input) => input.outputs, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'inputid' })
    input: AiSearchInput;

    @Column({ type: 'jsonb', nullable: true })
    response?: any;

    @Column({ default: true })
    success: boolean;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
