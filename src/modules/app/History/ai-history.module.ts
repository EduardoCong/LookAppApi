import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSearchInput } from './entities/ai_search_input.entity';
import { AiSearchOutput } from './entities/ai_search_output.entity';
import { AiHistoryService } from './history.service';

@Module({
    imports: [TypeOrmModule.forFeature([AiSearchInput, AiSearchOutput])],
    providers: [AiHistoryService],
    exports: [AiHistoryService],
})
export class AiHistoryModule { }
