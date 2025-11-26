import { ApiProperty } from '@nestjs/swagger';

export class PayCartStoreFisicoDto {
    @ApiProperty({
        example: 'fisico',
        description: 'Tipo de pago, siempre será "fisico"',
    })
    paymentType: 'fisico';
}
