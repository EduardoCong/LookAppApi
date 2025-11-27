import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSearchInput } from './entities/ai_search_input.entity';
import { AiSearchOutput } from './entities/ai_search_output.entity';
import { User } from '../../users/entities/user.entity';


@Injectable()
export class AiHistoryService {
    constructor(
        @InjectRepository(AiSearchInput)
        private readonly inputRepo: Repository<AiSearchInput>,

        @InjectRepository(AiSearchOutput)
        private readonly outputRepo: Repository<AiSearchOutput>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async getUserInputs(userId: number) {
        const inputs = await this.inputRepo.find({
            where: { user: { id: userId } },
            relations: ['outputs'],
            order: { created_at: 'DESC' },
        });

        return inputs.map((input) => ({
            id: input.id,
            type: input.type,
            query: input.query,
            created_at: input.created_at,
            hasOutputs: input.outputs.length > 0,
        }));
    }

    async getOutputsForInput(inputId: number, userId: number) {
        const input = await this.inputRepo.findOne({
            where: { id: inputId },
            relations: ['user'],
        });

        if (!input) {
            throw new NotFoundException('El historial solicitado no existe');
        }

        if (input.user?.id !== userId) {
            throw new ForbiddenException('No tienes permiso para ver este historial');
        }

        // 2️⃣ Obtenemos los outputs asociados
        const outputs = await this.outputRepo.find({
            where: { input: { id: inputId } },
            order: { created_at: 'DESC' },
        });

        return {
            input: {
                id: input.id,
                type: input.type,
                query: input.query,
                created_at: input.created_at,
            },
            outputs: outputs.map((o) => ({
                id: o.id,
                success: o.success,
                response: o.response,
                created_at: o.created_at,
            })),
        };
    }

    async getMe(userId: number) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: [
                'store',
            ],
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }


        return user;
    }
}
