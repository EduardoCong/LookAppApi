import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsString,
    IsNumber,
    IsOptional,
    IsInt,
} from 'class-validator';

export class CreateProductDto {
    @ApiProperty({ description: 'Nombre del producto', example: 'Laptop HP' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Descripción del producto',
        required: false,
        example: 'Laptop de 15 pulgadas con Ryzen 5',
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Precio en MXN', example: 12999.99 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    price: number;


    @ApiProperty({ description: 'Cantidad en stock', example: 10 })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    stock: number;

    @ApiProperty({
        description: 'URL de la imagen (si aplica)',
        required: false,
        example: 'https://cdn.lookapp.com/products/laptop.jpg',
    })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiProperty({ description: 'ID de la tienda', example: 1 })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty({ message: 'El ID de la tienda es obligatorio' })
    storeId: number;

    @ApiProperty({ description: 'ID de la categoría', example: 3, required: false })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    categoryId?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) { }
