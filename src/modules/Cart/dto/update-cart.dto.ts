import { IsInt, Min } from 'class-validator';

export class UpdateCartDto {
    @IsInt()
    @Min(0)
    quantity: number;
}
