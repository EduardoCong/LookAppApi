import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateStoreDto {
    @ApiProperty({
        example: 'La Tienda Verde',
        description: 'Nombre comercial o razón social de la tienda.',
    })
    @IsNotEmpty()
    business_name: string;

    @ApiProperty({
        example: 'María López',
        description: 'Nombre del propietario o representante legal.',
    })
    @IsNotEmpty()
    owner_name: string;

    @ApiProperty({
        example: 'Av. 60 #123, Centro, Mérida, Yucatán',
        description: 'Dirección completa de la tienda.',
    })
    @IsNotEmpty()
    address: string;

    @ApiProperty({
        example: 'https://goo.gl/maps/example',
        description: 'URL del mapa de la ubicación (opcional).',
        required: false,
    })
    @IsOptional()
    map_url?: string;

    @ApiProperty({
        example: '-89.6170',
        description: 'Longitud geográfica de la ubicación de la tienda (opcional).',
        required: false,
    })
    @IsNotEmpty()
    longitude?: string;

    @ApiProperty({
        example: '20.9678',
        description: 'Latitud geográfica de la ubicación de la tienda (opcional).',
        required: false,
    })
    @IsNotEmpty()
    latitude?: string;

    @ApiProperty({
        example: 'Tienda de productos ecológicos y orgánicos.',
        description: 'Breve descripción de la tienda.',
        required: false,
    })
    @IsOptional()
    description?: string;

    @ApiProperty({
        example: 3,
        description: 'ID del usuario propietario (debe existir en la tabla users).',
    })
    @IsInt()
    user_id: number;

    @ApiProperty({
        example: 2,
        description: 'ID de la categoría asociada (debe existir en la tabla categories).',
    })
    @IsInt()
    category_id: number;
}

export class UpdateStoreDto extends PartialType(CreateStoreDto) { }
