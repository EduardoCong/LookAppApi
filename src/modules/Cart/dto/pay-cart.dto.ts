import { IsString, IsNotEmpty } from 'class-validator';

export class PayCartDto {
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string;
}
