import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddToCartDto {
    @IsInt()
    @Min(1)
    productId: number;

    @IsInt()
    @Min(1)
    quantity: number;
}
