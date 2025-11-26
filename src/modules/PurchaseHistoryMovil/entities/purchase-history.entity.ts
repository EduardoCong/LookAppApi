import { ApiProperty } from '@nestjs/swagger';

export class PurchaseHistory {
    @ApiProperty()
    id: number;

    @ApiProperty({ enum: ['full', 'apartado', 'fisico'] })
    type: 'full' | 'apartado' | 'fisico';

    @ApiProperty()
    product: string;

    @ApiProperty()
    store: string;

    @ApiProperty()
    quantity: number;

    @ApiProperty()
    unit_price: number;

    @ApiProperty()
    total_price: number;

    @ApiProperty()
    status: string;

    @ApiProperty()
    created_at: Date;
}
