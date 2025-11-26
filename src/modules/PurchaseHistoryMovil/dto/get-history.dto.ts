import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetPurchaseHistoryDto {
    @ApiPropertyOptional({
        description: 'Filtrar por status',
        example: 'pendiente',
    })
    @IsOptional()
    @IsString()
    status?: string;
}
