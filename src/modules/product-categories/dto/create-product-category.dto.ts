import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProductCategoryDto {
    @ApiProperty({
        description: 'Nombre de la categoría',
        example: 'Electrónica',
    })
    @IsString()
    @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
    name: string;

    @ApiProperty({
        description: 'Descripción opcional de la categoría',
        example: 'Productos relacionados con tecnología y dispositivos electrónicos',
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateProductCategoryDto extends PartialType(CreateProductCategoryDto) { }
