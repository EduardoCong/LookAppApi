import { ApiProperty } from '@nestjs/swagger';

export class PayFisicoIndividualDto {
    @ApiProperty({ example: 12, description: 'ID del producto a comprar' })
    productId: number;

    @ApiProperty({ example: 2, description: 'Cantidad a comprar' })
    quantity: number;
}
