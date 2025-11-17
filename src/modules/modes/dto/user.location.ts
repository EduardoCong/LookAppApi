import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UserLocationDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;
}
