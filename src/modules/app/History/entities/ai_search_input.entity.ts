import { User } from 'src/modules/users/entities/user.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    JoinColumn,
} from 'typeorm';
import { AiSearchOutput } from './ai_search_output.entity';


@Entity('ai_search_input')
export class AiSearchInput {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userid' })
    user?: User;

    @Column({ length: 20 })
    type: string;

    @Column({ type: 'text' })
    query: string;

    @OneToMany(() => AiSearchOutput, (output) => output.input)
    outputs: AiSearchOutput[];

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
