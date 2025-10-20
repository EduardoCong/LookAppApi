import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({
        example: 'Restaurantes',
        description: 'Nombre de la categoría o tipo de tienda.',
    })
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: 'Locales dedicados a la venta de alimentos y bebidas.',
        description: 'Descripción opcional de la categoría.',
        required: false,
    })
    @IsOptional()
    description?: string;
}
