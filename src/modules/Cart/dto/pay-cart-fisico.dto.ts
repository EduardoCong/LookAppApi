import { ApiProperty } from '@nestjs/swagger';

export class PayCartFisicoDto {
    @ApiProperty({
        example: 'fisico',
        description: 'Tipo de pago, siempre será "fisico"',
    })
    paymentType: 'fisico';
}
